# NWSBox Technical Documentation

Operational facts (versions, install, CI, environment variable names, Coolify) are in the [README](README.md) and [docs/reference.md](docs/reference.md). This file describes how the source is put together. Corrections below are from a read of the tree on 2026-11-22.

## Overview

NWSBox (Node Workspace Sandbox) is a CLI tool that provides isolated Node.js environments for projects. It creates per-project sandboxes with isolated Node.js versions, authentication credentials, configuration files, and package caches.

## Architecture

### Core Components

NWSBox consists of four main components:

1. **Workspace Management** - Detection, creation, and configuration
2. **Node.js Version Management** - Downloading and installing Node.js versions
3. **Environment Isolation** - Building isolated execution environments
4. **Command Execution** - Running commands within isolated environments

### Directory Structure

```
nwsbox/
├── bin/run                 # CLI entry point
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── init.ts        # Workspace initialization
│   │   ├── node.ts        # Node.js version management
│   │   ├── run.ts         # Command execution
│   │   ├── exec.ts        # Shell command execution
│   │   ├── activate.ts    # Workspace activation
│   │   └── info.ts        # Workspace information
│   ├── utils/             # Core utilities
│   │   ├── workspace.ts   # Workspace detection & config
│   │   ├── node-installer.ts  # Node.js download & install
│   │   ├── env.ts         # Environment building
│   │   ├── shim.ts        # Command shim creation
│   │   └── command-runner.ts  # Command execution
│   └── types/             # TypeScript type definitions
└── lib/                   # Compiled JavaScript (generated)
```

## How It Works

### 1. Workspace Detection

NWSBox uses a **walk-up directory tree** algorithm to find workspaces:

```typescript
function findWorkspaceRoot(startPath: string = process.cwd()): string | null {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;

  while (current !== root) {
    const wsPath = path.join(current, WORKSPACE_DIR); // .ws
    if (fs.existsSync(wsPath) && fs.statSync(wsPath).isDirectory()) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}
```

**Key Points:**
- Starts from current working directory
- Walks up to filesystem root
- Looks for `.ws/` directory
- Returns first match or `null`

### 2. Workspace Structure

When `nwsbox init` is run, it creates:

```
project-root/
└── .ws/
    ├── config.json       # Workspace metadata
    ├── node/             # Empty until `node install`. Then one directory per version (for example v20.19.6/bin)
    ├── env/              # Isolated HOME directory
    │   └── .config/      # XDG_CONFIG_HOME (created empty by init)
    ├── cache/            # Cache root. npm/, yarn/, pnpm/, and xdg/ are not created by init
    └── shims/            # Command shims
        ├── node          # Executable shim scripts
        ├── npm
        ├── npx
        ├── yarn
        └── pnpm
```

### 3. Environment Isolation

NWSBox isolates a workspace by overriding a fixed set of environment variables. `mergeEnvironment` copies the parent environment first, so variables it does not override (including tokens that live in the environment) are still present. File-based config under the real home directory is avoided because `HOME` points at `.ws/env`.

#### Environment Variables Overridden

```typescript
{
  HOME: '.ws/env',                    // Isolated home directory
  USERPROFILE: '.ws/env',             // Windows compatibility
  XDG_CONFIG_HOME: '.ws/env/.config', // CLI tool configs
  XDG_CACHE_HOME: '.ws/cache/xdg',   // Cache directory
  XDG_DATA_HOME: '.ws/env/.local/share',
  XDG_STATE_HOME: '.ws/env/.local/state',
  PATH: '[node-bin]:[shims]:[system-path]',  // node-bin only when config.node is set
  NODE_PATH: 'project-root/node_modules',    // only when config.node is set
  NPM_CONFIG_CACHE: '.ws/cache/npm',
  YARN_CACHE_FOLDER: '.ws/cache/yarn',
  PNPM_HOME: '.ws/cache/pnpm',
  TERM: process.env.TERM,                    // passed through
  SHELL: process.env.SHELL,
  EDITOR: process.env.EDITOR,
  LANG: process.env.LANG,
  LC_ALL: process.env.LC_ALL,
}
```

Bash shims export the path variables above and do not set `NODE_PATH`, `TERM`, `SHELL`, `EDITOR`, `LANG`, or `LC_ALL`.

#### PATH Construction

The PATH is constructed in this order:
1. **Node.js binary directory** (if Node version is set): `.ws/node/{version}/bin`
2. **Shims directory**: `.ws/shims`
3. **System PATH**: Original system PATH

This ensures:
- Workspace Node.js is used first
- Workspace shims are available
- System binaries are fallback

### 4. Command Execution Flow

#### Using `nwsbox run` or `nwsbox exec`

```
User Command: nwsbox run npm install
    ↓
1. Find workspace root (walk up directory tree)
    ↓
2. Load workspace config (.ws/config.json)
    ↓
3. Build isolated environment (override HOME, PATH, etc.)
    ↓
4. Find command binary:
   - Check workspace shims first
   - Fallback to system binary
    ↓
5. Spawn process with isolated environment
    ↓
6. Command executes with isolated:
   - Node.js version
   - Authentication (from .ws/env/.config/)
   - Cache directories
   - Configuration files
```

#### Using Shims Directly (After Activation)

```
User Command: npm install (after eval "$(nwsbox activate)")
    ↓
1. Shim script executes (from .ws/shims/npm)
    ↓
2. Shim finds workspace root (walk up from PWD)
    ↓
3. Shim reads Node version from config.json
    ↓
4. Shim sets environment variables:
   - HOME, XDG_*, PATH, cache dirs
    ↓
5. Shim finds binary (workspace Node.js or system)
    ↓
6. Executes binary with isolated environment
```

### 5. Shim Implementation

Shims are bash scripts that:
1. **Detect workspace** by walking up directory tree
2. **Load environment** from workspace config
3. **Set environment variables** for isolation
4. **Execute command** with isolated environment

**Shim Template Structure:**
```bash
#!/bin/bash
# 1. Find workspace root (walk up tree)
# 2. If no workspace, use system command
# 3. Load workspace environment
# 4. Set HOME, XDG_*, PATH, cache dirs
# 5. Find binary (workspace or system)
# 6. Execute with exec
```

### 6. Node.js Version Management

#### Version Parsing

```typescript
parseNodeVersion("20")        → "v20"
parseNodeVersion("18.17.0")   → "v18.17.0"
parseNodeVersion("v20.11.0")  → "v20.11.0"
```

#### Version Resolution

`parseNodeVersion` only trims the string and adds a `v` prefix. The downloader then branches once:

1. **Single numeric component** (`20`, `v20`): fetch `https://nodejs.org/dist/index.json` and take the `v20.*` entry with the latest `date`.
2. **Anything else** (`18.17.0`, `v20.11.0`, `18.17`): request that exact tarball name. A minor-only string such as `18.17` is not expanded to the latest `18.17.x`. Node's dist filenames are full `x.y.z` versions, so `18.17` fails the HTTP download.

#### Download Process

```typescript
1. Parse version string
2. If major version only, fetch latest from nodejs.org/dist/index.json
3. Construct download URL:
   - Platform: darwin, linux, win
   - Arch: x64, arm64
   - Format: tar.gz (Unix) or zip (Windows)
4. Download from nodejs.org/dist/{version}/{filename}
5. Extract to .ws/node/{version}/
6. Update workspace config with full version
```

**Platform Detection:**
- `darwin` → macOS
- `linux` → Linux
- `win32` → Windows (ZIP extraction not yet implemented)

### 7. Configuration Management

#### Config File Structure

```json
{
  "created": "2024-01-01T00:00:00.000Z",
  "updated": "2024-01-01T00:00:00.000Z",
  "name": "my-project",
  "node": "v20.19.6"
}
```

#### Config Operations

- **Read**: Loads JSON, returns empty object on error
- **Write**: Merges with existing config, updates `updated` timestamp
- **Validation**: Gracefully handles invalid JSON (returns empty object)

### 8. Command Execution Details

#### Process Spawning

```typescript
spawn(command, args, {
  stdio: 'inherit',      // Forward stdin/stdout/stderr
  env: isolatedEnv,      // Isolated environment
  cwd: process.cwd(),    // Current working directory
  shell: useShell        // Shell execution mode
})
```

**Key Behaviors:**
- `stdio: 'inherit'` - User sees command output directly
- Environment is fully isolated
- Exit code is preserved and passed through

## Data Flow Diagrams

### Initialization Flow

```
nwsbox init
  ↓
ensureWorkspaceStructure()
  ├── Create .ws/ directory
  ├── Create node/, env/, cache/, shims/ subdirectories
  └── Create .ws/env/.config/
  ↓
writeWorkspaceConfig()
  └── Write config.json with metadata
  ↓
createDefaultShims()
  └── Create shims for: node, npm, npx, yarn, pnpm
```

### Command Execution Flow

```
nwsbox run <command>
  ↓
findWorkspaceRoot()
  └── Walk up directory tree to find .ws/
  ↓
getWorkspacePaths()
  └── Generate paths for all workspace directories
  ↓
readWorkspaceConfig()
  └── Load config.json
  ↓
buildWorkspaceEnvironment()
  ├── Read config
  ├── Construct PATH
  ├── Set HOME, XDG_* variables
  └── Set cache directories
  ↓
mergeEnvironment()
  └── Merge with system environment
  ↓
findSystemBinary() or use shim
  └── Locate command binary
  ↓
spawnCommand()
  └── Execute with isolated environment
```

### Activation Flow

```
eval "$(nwsbox activate)"
  ↓
nwsbox activate command
  └── Output: export PATH=".ws/shims:$PATH"
  ↓
Shell evaluates export
  └── Adds shims to PATH
  ↓
User runs: npm install
  ↓
Shell finds npm in PATH (.ws/shims/npm)
  ↓
Shim script executes
  ├── Finds workspace root
  ├── Loads environment
  └── Executes npm with isolation
```

## Security Considerations

### Isolation Guarantees

1. **File System Isolation**
   - All workspace data in `.ws/` directory
   - No modification of system directories
   - No global state changes

2. **Environment Isolation**
   - Environment variables scoped to workspace
   - System environment preserved (read-only)
   - PATH manipulation is additive (prepends, doesn't replace)

3. **Authentication files**
   - CLI tools that honor `HOME` or `XDG_CONFIG_HOME` store files under `.ws/env/`
   - The parent environment is copied through, so credentials that already live in environment variables stay available to the child
   - Each workspace has its own `HOME`, so file-based logins do not share the real home directory

### Security Best Practices

- **Shims**: Executable permissions (0o755) - standard for shell scripts
- **Config Files**: JSON validation with error handling
- **Path Resolution**: Uses `path.resolve()` to prevent directory traversal
- **Command Execution**: Uses `spawn()` with explicit environment (no shell injection)

## Error Handling

### Error Types

1. **Workspace Not Found**
   - Error: `"Not in a workspace. Run "nwsbox init" first."`
   - Triggered when: No `.ws/` directory found

2. **Command Not Found**
   - Error: `"Command not found: {command}"`
   - Triggered when: Binary not in workspace or system PATH

3. **Version Not Found**
   - Error: `"No version found for Node {major}"`
   - Triggered when: Major version doesn't exist on nodejs.org

4. **Download Failure**
   - Error: `"Failed to download: {statusCode}"`
   - Triggered when: HTTP request fails

5. **Invalid Config**
   - Behavior: Returns empty object, continues execution
   - Triggered when: JSON parse fails

### Error Recovery

- **Config corruption**: Automatically returns empty config, allows re-initialization
- **Missing directories**: Created on-demand with `fs.ensureDir()`
- **Network failures**: User must retry (no automatic retry)

## Performance Considerations

### Caching

- **Node.js versions**: Cached in `.ws/node/` (not re-downloaded)
- **Workspace config**: Read once per command execution
- **Environment building**: Minimal overhead (object construction)

### Optimization Strategies

1. **Lazy Loading**: Config and environment built only when needed
2. **Path Resolution**: Cached in workspace config (Node version)
3. **Binary Lookup**: Checks workspace shims first (faster than system PATH)

## Platform Support

### Supported Platforms

- **macOS**: Full support (darwin)
- **Linux**: Full support
- **Windows**: Partial support (WSL recommended)

### Windows Limitations

- ZIP extraction not implemented
- Use WSL or manually extract Node.js binaries
- Path handling works (uses `path.delimiter`)

## Testing Strategy

### Test Coverage

59 `it` cases. They cover workspace lookup, config IO, the environment object, `parseNodeVersion`, and shim file contents. They do not download Node.js, spawn the `nwsbox` binary, or invoke the oclif command classes. `test/commands.test.ts` calls the workspace helpers used by init.

### Test Files

- `workspace.test.ts` — workspace detection, paths, config, directories `init` creates (11)
- `workspace-edge-cases.test.ts` — root path, a `.ws` file, odd paths, bad JSON (14)
- `env.test.ts` — environment building and merge (7)
- `node-installer.test.ts` — `parseNodeVersion` (4)
- `node-installer-edge-cases.test.ts` — `parseNodeVersion` edge strings (9)
- `shim.test.ts` — shim contents and the default command list (7)
- `command-runner.test.ts` — workspace lookup and the error string (4)
- `commands.test.ts` — workspace helpers used by init (3)

## Extension Points

### Adding New Shims

```typescript
// In src/utils/shim.ts
export async function createDefaultShims(paths: WorkspacePaths): Promise<void> {
  const commands = ['node', 'npm', 'npx', 'yarn', 'pnpm', 'your-tool'];
  for (const cmd of commands) {
    await createShim(cmd, paths);
  }
}
```

### Custom Environment Variables

```typescript
// In src/utils/env.ts
export async function buildWorkspaceEnvironment(...) {
  const env = {
    // ... existing variables
    YOUR_TOOL_CONFIG: path.join(paths.env, '.config', 'your-tool'),
  };
  return env;
}
```

## Dependencies

### Runtime Dependencies

- `@oclif/core` - CLI framework
- `fs-extra` - Enhanced file system operations
- `tar` - Archive extraction
- `which` - Binary location

### Development Dependencies

- `typescript` - Type checking and compilation
- `vitest` - Testing framework
- `@types/*` - TypeScript type definitions

## Build Process

```
TypeScript Source (src/)
  ↓
TypeScript Compiler (tsc)
  ↓
JavaScript Output (lib/)
  ↓
Oclif Manifest Generation
  ↓
Package Ready for Distribution
```

## CLI Command Architecture

### Command Structure

All commands extend `@oclif/core` Command class:

```typescript
export default class CommandName extends Command {
  static description = 'Command description';
  static examples = ['usage examples'];
  static flags = { /* flag definitions */ };
  static args = { /* argument definitions */ };
  
  async run(): Promise<void> {
    // Command implementation
  }
}
```

### Command Registration

- Commands auto-discovered from `lib/commands/`
- Registered via `oclif.manifest.json`
- Binary entry point: `bin/run`

## Future Enhancements

### Potential Improvements

1. **Windows ZIP Support**: Implement ZIP extraction for Windows
2. **Version Caching**: Cache version index for faster lookups
3. **Parallel Downloads**: Download multiple Node versions concurrently
4. **Workspace Templates**: Pre-configured workspace templates
5. **Plugin System**: Allow custom environment builders

## Troubleshooting

### Common Issues

1. **Workspace not detected**
   - Ensure `.ws/` directory exists
   - Check current directory is within workspace

2. **Command not found**
   - Verify command exists in system PATH
   - Check shim was created correctly

3. **Node version not installing**
   - Check internet connection
   - Verify version exists on nodejs.org
   - Try specific version (e.g., `v20.11.0`)

4. **Environment not isolated**
   - Verify `HOME` is set to `.ws/env`
   - Check `PATH` includes workspace directories
   - Ensure shims are executable

## API Reference

### Core Functions

#### Workspace Utilities

- `findWorkspaceRoot(startPath?)` - Find workspace root directory
- `getWorkspacePaths(workspaceRoot)` - Get all workspace paths
- `readWorkspaceConfig(workspaceRoot)` - Read workspace config
- `writeWorkspaceConfig(workspaceRoot, config)` - Write workspace config
- `ensureWorkspaceStructure(workspaceRoot)` - Create workspace structure

#### Environment Building

- `buildWorkspaceEnvironment(workspaceRoot, paths)` - Build isolated environment
- `mergeEnvironment(overrides)` - Merge with system environment

#### Node.js Management

- `parseNodeVersion(version)` - Parse and normalize version string
- `installNodeVersion(version, paths)` - Download and install Node.js

#### Command Execution

- `runCommandInWorkspace(command, args, useShell)` - Run command with isolation
- `runShellCommandInWorkspace(command)` - Run shell command with isolation

#### Shim Management

- `createShim(command, paths)` - Create shim for command
- `createDefaultShims(paths)` - Create default shims
- `findSystemBinary(command)` - Find system binary location

---

**Created by**: XCO Agency LLC  
**Documentation reviewed**: 2026-11-22  
**Committed package version**: 0.2.1 in `package.json` and `package-lock.json`. `oclif.manifest.json` says 0.2.2. npm `latest` is 0.4.6.


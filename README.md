# NWS - Node Workspace Sandbox

**NWS** provides isolated Node.js workspaces with complete environment isolation — like "virtualenv for Node", but with authentication, configuration, version, and cache isolation.

## Why NWS?

Working with multiple Node.js projects often leads to:
- **Version conflicts** - Different projects need different Node.js versions
- **Authentication mixing** - CLI tools store global credentials that get mixed between projects
- **Cache pollution** - npm/yarn/pnpm caches shared across all projects
- **Config conflicts** - Global configs affecting all projects

NWS solves these by creating **fully isolated workspaces** where each project has:
- ✅ Its own Node.js version
- ✅ Isolated CLI authentication (npm tokens, CLI tool credentials, etc.)
- ✅ Separate caches (npm, yarn, pnpm)
- ✅ Isolated configuration files
- ✅ No global contamination

## Installation

```bash
npm install -g nws
# or
pnpm add -g nws
# or
yarn global add nws
```

Verify installation:
```bash
nws --version
# or
ws --version  # 'ws' is an alias for 'nws'
```

## Quick Start

### 1. Initialize a Workspace

```bash
cd my-project
nws init
```

Or with a specific Node.js version:
```bash
nws init --node 20
nws init --name "my-project" --node 20
```

This creates a `.ws/` directory with all isolation infrastructure.

### 2. Install Node.js Versions

```bash
# Install a version (downloads latest 20.x.x)
nws node install 20

# Install specific version
nws node install 18.17.0
nws node install v20.11.0

# List installed versions
nws node list

# Switch active version
nws node use 20
```

### 3. Activate Workspace (Recommended)

Activate the workspace to use commands directly without `nws` prefix:

```bash
# Activate for current shell session
eval "$(nws activate)"

# Now use commands directly!
node --version
npm install
npm login  # CLI tools use workspace config automatically
```

**Or manually add to PATH:**
```bash
export PATH="$PWD/.ws/shims:$PATH"
```

### 4. Run Commands (Alternative Methods)

If you prefer not to activate, you can use:

```bash
# Using exec (recommended for commands with flags)
nws exec "node --version"
nws exec "npm install"
nws exec "npm login"

# Using run (use -- separator for flags)
nws run -- node --version
nws run -- npm install
nws run npm login
```

### 5. Check Status

```bash
nws info
```

## Commands

### `nws init [OPTIONS]`

Initialize a new workspace.

**Options:**
- `--node, -n <version>` - Install and set a specific Node.js version
- `--name <name>` - Set a workspace name

**Examples:**
```bash
nws init
nws init --node 20
nws init --name "my-app" --node 18
```

### `nws node <action> [version]`

Manage Node.js versions.

**Actions:**
- `install <version>` - Install a Node.js version
- `use <version>` - Switch to a different version
- `list` - List all installed versions

**Examples:**
```bash
nws node install 20          # Downloads latest 20.x.x
nws node install 18.17.0     # Specific version
nws node install v20.11.0    # Exact version with 'v' prefix
nws node list                # List installed versions
nws node use 20              # Switch active version
```

**Version Format:**
- `20` → Downloads latest v20.x.x
- `18.17` → Downloads latest v18.17.x
- `v20.11.0` → Exact version

### `nws run <command> [args...]`

Run a command in the workspace environment.

**For commands with flags, use `--` separator:**
```bash
nws run -- node --version
nws run -- npm install --save express
```

**For commands without flags:**
```bash
nws run node app.js
nws run npm login
```

**Options:**
- `--shell, -s` - Run command in a shell

### `nws exec <command>`

Execute a command string in the workspace environment (runs in shell).

**Recommended for:** Commands with flags or complex command strings.

**Examples:**
```bash
nws exec "node --version"
nws exec "npm install && npm run build"
nws exec "npm login --registry https://registry.example.com"
nws exec "NODE_ENV=production npm start"
```

**When to use `exec` vs `run`:**
- Use `exec` for commands with flags or complex strings
- Use `run` for simple commands without flags

### `nws activate`

Activate workspace shims by adding them to PATH. This allows you to use commands directly without the `nws` prefix.

**Usage:**
```bash
# Activate for current shell session
eval "$(nws activate)"

# Or manually
export PATH="$PWD/.ws/shims:$PATH"
```

**After activation, use commands directly:**
```bash
node --version    # Uses workspace Node.js
npm install       # Uses workspace npm
npm login         # Stores auth in workspace
```

The shims automatically detect the workspace and use the isolated environment.

### `nws info`

Show workspace information including root path, name, Node version, installed versions, and environment paths.

## How It Works

NWS uses a **shim-based approach**:

1. **Workspace Detection** - Looks for `.ws/` directory up the directory tree
2. **Environment Injection** - Overrides HOME, PATH, XDG directories
3. **Command Execution** - Commands run with isolated environment

### Workspace Structure

```
my-project/
├── .ws/
│   ├── config.json       # Workspace metadata
│   ├── node/             # Node.js binaries
│   │   └── v20.19.6/
│   ├── env/              # Isolated HOME
│   │   ├── .npmrc        # NPM config
│   │   └── .config/      # CLI configs (XDG-compliant tools)
│   ├── cache/            # Isolated caches
│   └── shims/            # Command shims
└── package.json
```

### Environment Isolation

When you run commands, NWS overrides:
- `HOME` → `.ws/env`
- `XDG_CONFIG_HOME` → `.ws/env/.config`
- `PATH` → `.ws/node/{version}/bin:.ws/shims:$PATH`
- Cache directories for npm/yarn/pnpm

CLI tools automatically use the workspace's isolated environment:
- **NPM tokens**: Stored in `.ws/env/.npmrc`
- **Any XDG-compliant CLI**: Config stored in `.ws/env/.config/{tool-name}/`
- **All authentication**: Isolated per workspace

## Use Cases

### Multiple Projects with Same CLI Tool (Different Accounts)

Perfect for working with multiple projects that use the same CLI tool but require different authentication:

```bash
# Project 1 - Client A
cd client-a-project
nws init --node 20
eval "$(nws activate)"
my-cli-tool login --account client-a@example.com
my-cli-tool deploy

# Project 2 - Client B (same CLI tool, different account)
cd ../client-b-project
nws init --node 18
eval "$(nws activate)"
my-cli-tool login --account client-b@example.com
my-cli-tool deploy
```

Each project has its own authentication and Node.js version, completely isolated.

### Testing Different Node Versions

```bash
nws init
nws node install 18
nws node install 20
nws node install 22

nws node use 18 && nws exec "npm test"
nws node use 20 && nws exec "npm test"
nws node use 22 && nws exec "npm test"
```

### Client Projects with Different Requirements

```bash
# Client A - Node 18, specific npm token
cd client-a-project
nws init --node 18
eval "$(nws activate)"
npm login  # Token stored in .ws/env/.npmrc

# Client B - Node 20, different npm token
cd ../client-b-project
nws init --node 20
eval "$(nws activate)"
npm login  # Separate token, no conflict!
```

## Advanced Usage

### Auto-Activate in Shell Profile

Add to your `~/.bashrc`, `~/.zshrc`, or `~/.config/fish/config.fish`:

```bash
# Bash/Zsh
if [ -f .ws/config.json ]; then
  export PATH="$PWD/.ws/shims:$PATH"
fi

# Or use direnv (if installed)
echo 'eval "$(nws activate)"' >> .envrc
direnv allow
```

### Using Shims Directly

Shims automatically detect the workspace and use the isolated environment. Just add them to PATH:

```bash
export PATH="$PWD/.ws/shims:$PATH"

# Now commands automatically use workspace environment
node --version  # Uses workspace Node.js
npm install     # Uses workspace npm
npm login       # Stores auth in workspace
```

### Workspace Detection

NWS automatically detects workspaces by looking for `.ws/` directory:

```bash
# Works from any subdirectory
cd /project/subdir/deep/nested
nws info  # Still finds /project/.ws/
```

## Troubleshooting

### Command Not Found

```bash
# Verify installation
which nws

# Reinstall if needed
npm install -g nws
```

### Workspace Not Found

Error: `Not in a workspace. Run "nws init" first.`

```bash
cd /path/to/your/project
nws init
```

### Node Version Not Installing

```bash
# Check internet connection
ping nodejs.org

# Try specific version
nws node install v20.11.0
```

### Commands with Flags Not Working

Use `--` separator or `exec` command:

```bash
# Wrong
nws run node --version

# Correct
nws run -- node --version
# or
nws exec "node --version"
```

### Windows Support

**Note:** Windows ZIP extraction for Node.js is not yet implemented. Use WSL or manually extract Node.js binaries.

## Development

### Building from Source

```bash
git clone <repo-url>
cd nws
npm install
npm run build
npm link  # Link globally for testing
```

### Project Structure

```
nws/
├── bin/run              # CLI entry point
├── src/
│   ├── commands/        # CLI commands
│   ├── utils/           # Core utilities
│   └── types/           # TypeScript types
├── lib/                 # Compiled JavaScript
└── package.json
```

## Examples

### Complete Workflow

```bash
# 1. Create new project
mkdir my-app
cd my-app

# 2. Initialize workspace
nws init --node 20 --name "my-app"

# 3. Activate workspace
eval "$(nws activate)"

# 4. Verify setup
nws info

# 5. Login to CLI tool (now works without nws prefix!)
my-cli-tool login --account user@example.com

# 6. Install dependencies
npm install

# 7. Run development server
npm start
```

### Switching Between Projects

```bash
# Work on Project A
cd ~/projects/project-a
eval "$(nws activate)"  # Activate Project A workspace
npm start              # Uses Project A's Node.js and config

# Switch to Project B
cd ~/projects/project-b
eval "$(nws activate)"  # Activate Project B workspace
npm start               # Uses Project B's Node.js and config
```

## License

MIT

## Acknowledgments

NWS is inspired by:
- Python's `virtualenv`
- `nvm` / `volta` for Node version management
- `direnv` for environment isolation
- `asdf` for version management

---

**Happy coding with isolated workspaces! 🚀**

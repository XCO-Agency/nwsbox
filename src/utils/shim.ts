import * as path from 'path';
import * as fs from 'fs-extra';
import { WorkspacePaths } from '../types/workspace';
import which from 'which';

const SHIM_TEMPLATE = `#!/bin/bash
# NWS Shim for {{COMMAND}}

# Find workspace root
WS_ROOT=""
CURRENT_DIR="$PWD"
while [ "$CURRENT_DIR" != "/" ]; do
  if [ -d "$CURRENT_DIR/.ws" ]; then
    WS_ROOT="$CURRENT_DIR"
    break
  fi
  CURRENT_DIR="$(dirname "$CURRENT_DIR")"
done

if [ -z "$WS_ROOT" ]; then
  # Not in workspace, use system command
  exec {{COMMAND}} "$@"
fi

# Load workspace environment
export HOME="$WS_ROOT/.ws/env"
export USERPROFILE="$WS_ROOT/.ws/env"
export XDG_CONFIG_HOME="$WS_ROOT/.ws/env/.config"
export XDG_CACHE_HOME="$WS_ROOT/.ws/cache/xdg"
export XDG_DATA_HOME="$WS_ROOT/.ws/env/.local/share"
export XDG_STATE_HOME="$WS_ROOT/.ws/env/.local/state"

# Read Node version from config
NODE_VERSION=""
if [ -f "$WS_ROOT/.ws/config.json" ]; then
  NODE_VERSION=$(grep -o '"node"[[:space:]]*:[[:space:]]*"[^"]*"' "$WS_ROOT/.ws/config.json" | cut -d'"' -f4)
fi

# Add workspace Node.js and shims to PATH
if [ -n "$NODE_VERSION" ] && [ -d "$WS_ROOT/.ws/node/$NODE_VERSION/bin" ]; then
  export PATH="$WS_ROOT/.ws/node/$NODE_VERSION/bin:$WS_ROOT/.ws/shims:$PATH"
else
  export PATH="$WS_ROOT/.ws/shims:$PATH"
fi

# NPM/Yarn/PNPM cache directories
export NPM_CONFIG_CACHE="$WS_ROOT/.ws/cache/npm"
export YARN_CACHE_FOLDER="$WS_ROOT/.ws/cache/yarn"
export PNPM_HOME="$WS_ROOT/.ws/cache/pnpm"

# Find binary: workspace Node.js first, then system
BINARY=""
if [ -n "$NODE_VERSION" ] && [ -f "$WS_ROOT/.ws/node/$NODE_VERSION/bin/{{COMMAND}}" ]; then
  BINARY="$WS_ROOT/.ws/node/$NODE_VERSION/bin/{{COMMAND}}"
fi

if [ -z "$BINARY" ]; then
  BINARY=$(command -v {{COMMAND}} 2>/dev/null || echo "")
fi

if [ -z "$BINARY" ]; then
  echo "Command not found: {{COMMAND}}" >&2
  exit 1
fi

exec "$BINARY" "$@"
`;

export async function createShim(command: string, paths: WorkspacePaths): Promise<void> {
  const shimPath = path.join(paths.shims, command);
  const content = SHIM_TEMPLATE.replace(/\{\{COMMAND\}\}/g, command);
  await fs.writeFile(shimPath, content, { mode: 0o755 });
}

export async function createDefaultShims(paths: WorkspacePaths): Promise<void> {
  const commands = ['node', 'npm', 'npx', 'yarn', 'pnpm'];
  for (const cmd of commands) {
    await createShim(cmd, paths);
  }
}

export async function findSystemBinary(command: string): Promise<string | null> {
  try {
    return await which(command);
  } catch {
    return null;
  }
}


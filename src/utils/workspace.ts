import * as path from 'path';
import * as fs from 'fs-extra';
import { WorkspaceConfig, WorkspacePaths } from '../types/workspace';

const WORKSPACE_DIR = '.ws';
const CONFIG_FILE = 'config.json';
export const WORKSPACE_ERROR = 'Not in a workspace. Run "nwsbox init" first.';

export function findWorkspaceRoot(startPath: string = process.cwd()): string | null {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;

  while (current !== root) {
    const wsPath = path.join(current, WORKSPACE_DIR);
    if (fs.existsSync(wsPath) && fs.statSync(wsPath).isDirectory()) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

export function getWorkspacePaths(workspaceRoot: string): WorkspacePaths {
  const wsDir = path.join(workspaceRoot, WORKSPACE_DIR);
  return {
    root: wsDir,
    config: path.join(wsDir, CONFIG_FILE),
    node: path.join(wsDir, 'node'),
    env: path.join(wsDir, 'env'),
    cache: path.join(wsDir, 'cache'),
    shims: path.join(wsDir, 'shims'),
  };
}

export async function readWorkspaceConfig(workspaceRoot: string): Promise<WorkspaceConfig> {
  const paths = getWorkspacePaths(workspaceRoot);
  
  if (!(await fs.pathExists(paths.config))) {
    return {};
  }

  try {
    const content = await fs.readJson(paths.config);
    return content as WorkspaceConfig;
  } catch (error) {
    return {};
  }
}

export async function writeWorkspaceConfig(
  workspaceRoot: string,
  config: WorkspaceConfig
): Promise<void> {
  const paths = getWorkspacePaths(workspaceRoot);
  const existing = await readWorkspaceConfig(workspaceRoot);
  const updated = {
    ...existing,
    ...config,
    updated: new Date().toISOString(),
  };

  await fs.ensureDir(paths.root);
  await fs.writeJson(paths.config, updated, { spaces: 2 });
}

export async function ensureWorkspaceStructure(workspaceRoot: string): Promise<WorkspacePaths> {
  const paths = getWorkspacePaths(workspaceRoot);

  await fs.ensureDir(paths.root);
  await fs.ensureDir(paths.node);
  await fs.ensureDir(paths.env);
  await fs.ensureDir(paths.cache);
  await fs.ensureDir(paths.shims);

  // Ensure .config directory for XDG_CONFIG_HOME
  await fs.ensureDir(path.join(paths.env, '.config'));

  return paths;
}




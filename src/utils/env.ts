import * as path from 'path';
import { WorkspacePaths } from '../types/workspace';
import { readWorkspaceConfig } from './workspace';

export async function buildWorkspaceEnvironment(
  workspaceRoot: string,
  paths: WorkspacePaths
): Promise<Record<string, string | undefined>> {
  const config = await readWorkspaceConfig(workspaceRoot);
  const existingPath = process.env.PATH || '';
  const pathDelimiter = path.delimiter;

  const env: Record<string, string | undefined> = {
    HOME: paths.env,
    USERPROFILE: paths.env,
    XDG_CONFIG_HOME: path.join(paths.env, '.config'),
    XDG_CACHE_HOME: path.join(paths.cache, 'xdg'),
    XDG_DATA_HOME: path.join(paths.env, '.local', 'share'),
    XDG_STATE_HOME: path.join(paths.env, '.local', 'state'),
    NPM_CONFIG_CACHE: path.join(paths.cache, 'npm'),
    YARN_CACHE_FOLDER: path.join(paths.cache, 'yarn'),
    PNPM_HOME: path.join(paths.cache, 'pnpm'),
    TERM: process.env.TERM,
    SHELL: process.env.SHELL,
    EDITOR: process.env.EDITOR,
    LANG: process.env.LANG,
    LC_ALL: process.env.LC_ALL,
  };

  if (config.node) {
    const nodeBinPath = path.join(paths.node, config.node, 'bin');
    env.PATH = `${nodeBinPath}${pathDelimiter}${paths.shims}${pathDelimiter}${existingPath}`;
    env.NODE_PATH = path.join(workspaceRoot, 'node_modules');
  } else {
    env.PATH = `${paths.shims}${pathDelimiter}${existingPath}`;
  }

  return env;
}

export function mergeEnvironment(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...process.env, ...overrides };
}

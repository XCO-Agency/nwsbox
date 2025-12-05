import { spawn } from 'child_process';
import { findWorkspaceRoot, getWorkspacePaths } from './workspace';
import { buildWorkspaceEnvironment, mergeEnvironment } from './env';

const WORKSPACE_ERROR = 'Not in a workspace. Run "nws init" first.';

async function getWorkspaceEnv(): Promise<{ env: NodeJS.ProcessEnv; workspaceRoot: string }> {
  const workspaceRoot = findWorkspaceRoot();
  if (!workspaceRoot) {
    throw new Error(WORKSPACE_ERROR);
  }
  const paths = getWorkspacePaths(workspaceRoot);
  const envOverrides = await buildWorkspaceEnvironment(workspaceRoot, paths);
  return { env: mergeEnvironment(envOverrides), workspaceRoot };
}

function spawnCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  useShell: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      env,
      cwd: process.cwd(),
      shell: useShell,
    });

    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        process.exit(code || 1);
      }
    });
  });
}

export async function runCommandInWorkspace(
  command: string,
  args: string[],
  useShell: boolean = false
): Promise<void> {
  const { env } = await getWorkspaceEnv();
  return spawnCommand(command, args, env, useShell);
}

export async function runShellCommandInWorkspace(command: string): Promise<void> {
  const { env } = await getWorkspaceEnv();
  return spawnCommand(command, [], env, true);
}

export { WORKSPACE_ERROR };


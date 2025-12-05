import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import { findWorkspaceRoot, getWorkspacePaths, WORKSPACE_ERROR } from '../utils/workspace';
import { findSystemBinary } from '../utils/shim';
import { runCommandInWorkspace } from '../utils/command-runner';
import * as fs from 'fs-extra';

export default class Run extends Command {
  static description = 'Run a command in the workspace environment';

  static examples = [
    '<%= config.bin %> run -- node --version',
    '<%= config.bin %> run npm install',
    '<%= config.bin %> run npm login',
  ];

  static flags = {
    shell: Flags.boolean({
      char: 's',
      description: 'Run command in a shell',
      default: false,
    }),
  };

  static strict = false;

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(Run);

    if (argv.length === 0) {
      this.error('No command provided. Example: nws run -- node --version');
      return;
    }

    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) {
      this.error(WORKSPACE_ERROR);
      return;
    }

    const paths = getWorkspacePaths(workspaceRoot);
    const [command, ...args] = argv as string[];

    // Find binary: workspace shim first, then system
    const shimPath = path.join(paths.shims, command);
    let binary = (await fs.pathExists(shimPath)) ? shimPath : await findSystemBinary(command);

    if (!binary) {
      this.error(`Command not found: ${command}`);
      return;
    }

    await runCommandInWorkspace(binary, args, flags.shell);
  }
}


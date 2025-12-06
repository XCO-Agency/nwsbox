import { Command, Flags } from '@oclif/core';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ensureWorkspaceStructure, writeWorkspaceConfig } from '../utils/workspace';
import { createDefaultShims } from '../utils/shim';

export default class Init extends Command {
  static description = 'Initialize a new NWS workspace in the current directory';

  static examples = [
    '<%= config.bin %> init',
    '<%= config.bin %> init --node 20',
  ];

  static flags = {
    node: Flags.string({
      char: 'n',
      description: 'Node.js version to install (e.g., 20, 18.17.0, v20.11.0)',
    }),
    name: Flags.string({
      description: 'Workspace name',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Init);
    const cwd = process.cwd();

    // Check if workspace already exists
    const wsPath = path.join(cwd, '.ws');
    if (await fs.pathExists(wsPath)) {
      this.error('Workspace already exists in this directory. Use "nwsbox node install <version>" to add Node versions.');
      return;
    }

    this.log('Initializing NWS workspace...');

    // Create workspace structure
    const paths = await ensureWorkspaceStructure(cwd);

    await writeWorkspaceConfig(cwd, {
      created: new Date().toISOString(),
      ...(flags.name && { name: flags.name }),
    });

    // Create default shims
    await createDefaultShims(paths);
    this.log('Created default shims: node, npm, npx, yarn, pnpm');

    // Install Node version if specified
    if (flags.node) {
      const { installNodeVersion } = await import('../utils/node-installer');
      this.log(`Installing Node.js ${flags.node}...`);
      const version = await installNodeVersion(flags.node, paths);
      await writeWorkspaceConfig(cwd, { node: version });
      this.log(`✓ Installed Node.js ${version}`);
    }

    this.log(`\n✓ Workspace initialized at ${cwd}/.ws`);
    this.log('\nNext steps:');
    this.log('  nwsbox node install <version>  - Install a Node.js version');
    this.log('  nwsbox run <command>           - Run a command in the workspace');
    this.log('  nwsbox exec <command>          - Execute a command with workspace environment');
  }
}


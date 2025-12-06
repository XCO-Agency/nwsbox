import { Command, Args } from '@oclif/core';
import { findWorkspaceRoot, getWorkspacePaths, writeWorkspaceConfig, WORKSPACE_ERROR } from '../utils/workspace';
import { installNodeVersion, parseNodeVersion } from '../utils/node-installer';

export default class Node extends Command {
  static description = 'Manage Node.js versions in the workspace';

  static examples = [
    '<%= config.bin %> node install 20',
    '<%= config.bin %> node install 18.17.0',
    '<%= config.bin %> node use 20',
  ];

  static flags = {};

  static args = {
    action: Args.string({
      required: true,
      description: 'Action to perform: install, use, list',
      options: ['install', 'use', 'list'],
    }),
    version: Args.string({
      required: false,
      description: 'Node.js version (e.g., 20, 18.17.0, v20.11.0)',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Node);
    const workspaceRoot = findWorkspaceRoot();

    if (!workspaceRoot) {
      this.error(WORKSPACE_ERROR);
      return;
    }

    const paths = getWorkspacePaths(workspaceRoot);

    switch (args.action) {
      case 'install': {
        if (!args.version) {
          this.error('Version required for install. Example: nwsbox node install 20');
          return;
        }

        this.log(`Installing Node.js ${args.version}...`);
        const version = await installNodeVersion(args.version, paths);
        this.log(`✓ Installed Node.js ${version}`);
        
        // Always update config with full version
        await writeWorkspaceConfig(workspaceRoot, { node: version });
        this.log(`✓ Set Node.js ${version} as active`);
        break;
      }

      case 'use': {
        if (!args.version) {
          this.error('Version required for use. Example: nwsbox node use 20');
          return;
        }

        const fs = await import('fs-extra');
        const searchVersion = parseNodeVersion(args.version);
        const entries = await fs.readdir(paths.node);
        const matching = entries.find((entry: string) => entry.startsWith(searchVersion));
        
        if (!matching) {
          this.error(`Node.js ${args.version} not installed. Run "nwsbox node install ${args.version}" first.`);
          return;
        }

        await writeWorkspaceConfig(workspaceRoot, { node: matching });
        this.log(`✓ Using Node.js ${matching}`);
        break;
      }

      case 'list': {
        const fs = await import('fs-extra');
        const path = await import('path');
        const { readWorkspaceConfig } = await import('../utils/workspace');
        
        if (!(await fs.pathExists(paths.node))) {
          this.log('No Node.js versions installed.');
          return;
        }

        const entries = await fs.readdir(paths.node);
        const versions = entries.filter(entry => {
          const versionPath = path.join(paths.node, entry);
          return fs.statSync(versionPath).isDirectory();
        });

        if (versions.length === 0) {
          this.log('No Node.js versions installed.');
          return;
        }

        const config = await readWorkspaceConfig(workspaceRoot);
        const activeVersion = config.node;

        this.log('Installed Node.js versions:');
        for (const version of versions.sort().reverse()) {
          const marker = version === activeVersion ? ' (active)' : '';
          this.log(`  ${version}${marker}`);
        }
        break;
      }

      default:
        this.error(`Unknown action: ${args.action}`);
    }
  }
}


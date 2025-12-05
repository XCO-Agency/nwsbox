import { Command } from '@oclif/core';
import { findWorkspaceRoot, getWorkspacePaths, readWorkspaceConfig, WORKSPACE_ERROR } from '../utils/workspace';
import * as fs from 'fs-extra';
import * as path from 'path';

export default class Info extends Command {
  static description = 'Show workspace information';

  static examples = [
    '<%= config.bin %> info',
  ];

  async run(): Promise<void> {
    const workspaceRoot = findWorkspaceRoot();

    if (!workspaceRoot) {
      this.error(WORKSPACE_ERROR);
      return;
    }

    const paths = getWorkspacePaths(workspaceRoot);
    const config = await readWorkspaceConfig(workspaceRoot);

    this.log('Workspace Information:');
    this.log(`  Root: ${workspaceRoot}`);
    this.log(`  Name: ${config.name || '(unnamed)'}`);
    this.log(`  Created: ${config.created || 'unknown'}`);
    this.log(`  Updated: ${config.updated || 'unknown'}`);
    this.log(`  Node Version: ${config.node || 'not set'}`);

    // List installed Node versions
    if (await fs.pathExists(paths.node)) {
      const entries = await fs.readdir(paths.node);
      const versions = entries.filter(entry => {
        const versionPath = path.join(paths.node, entry);
        return fs.statSync(versionPath).isDirectory();
      });

      if (versions.length > 0) {
        this.log(`\nInstalled Node Versions:`);
        for (const version of versions.sort().reverse()) {
          const marker = version === config.node ? ' (active)' : '';
          this.log(`  ${version}${marker}`);
        }
      }
    }

    // Show environment paths
    this.log(`\nEnvironment Paths:`);
    this.log(`  HOME: ${paths.env}`);
    this.log(`  XDG_CONFIG_HOME: ${path.join(paths.env, '.config')}`);
    this.log(`  Cache: ${paths.cache}`);
    this.log(`  Shims: ${paths.shims}`);
  }
}




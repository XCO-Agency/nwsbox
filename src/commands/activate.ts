import { Command } from '@oclif/core';
import { findWorkspaceRoot, getWorkspacePaths, WORKSPACE_ERROR } from '../utils/workspace';
import * as path from 'path';

export default class Activate extends Command {
  static description = 'Activate workspace shims (add to PATH)';

  static examples = [
    '<%= config.bin %> activate',
    'eval "$(nws activate)"',
  ];

  async run(): Promise<void> {
    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) {
      this.error(WORKSPACE_ERROR);
      return;
    }

    const paths = getWorkspacePaths(workspaceRoot);
    const shimsPath = paths.shims;

    // Detect shell
    const shell = process.env.SHELL || '/bin/bash';
    const shellName = path.basename(shell);

    if (shellName === 'fish') {
      // Fish shell syntax
      this.log(`set -gx PATH "${shimsPath}" $PATH`);
    } else {
      // Bash/Zsh syntax
      this.log(`export PATH="${shimsPath}:$PATH"`);
    }

    this.log('\n# To activate, run:');
    this.log(`#   eval "$(nws activate)"`);
    this.log('\n# Or manually add to your shell:');
    this.log(`#   export PATH="${shimsPath}:$PATH"`);
    this.log('\n# Now you can use commands directly:');
    this.log('#   node --version');
    this.log('#   npm install');
    this.log('#   npm login  # CLI tools use workspace config automatically');
  }
}


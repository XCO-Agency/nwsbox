import { Command } from '@oclif/core';
import { runShellCommandInWorkspace } from '../utils/command-runner';

export default class Exec extends Command {
  static description = 'Execute a command with workspace environment';

  static examples = [
    '<%= config.bin %> exec "node --version"',
    '<%= config.bin %> exec "npm install"',
    '<%= config.bin %> exec "npm login"',
  ];

  static strict = false;

  async run(): Promise<void> {
    const { argv } = await this.parse(Exec);

    if (argv.length === 0) {
      this.error('No command provided. Example: nws exec "node --version"');
      return;
    }

    const command = (argv as string[]).join(' ');
    await runShellCommandInWorkspace(command);
  }
}




import { execSync, spawn } from 'child_process';
import * as inquirer from 'inquirer';
import { version } from '../package.json';
import { IdCommands, NameCommands } from './enums';
import { info, logAndForget } from './helpers/logger';
import metadata from './metadata';
import Type from './types/type';

export default class Supdock {
  private commands: any;

  constructor() {
    this.commands = metadata;
  }

  public default(options: string[] = process.argv.slice(2)) {
    this.spawn('docker', options);
  }

  public async execute(command: string, type: Type, flags: string[] = []) {
    const { ids, names } = this.getDockerInfo(type)!;
    const { question, error } = this.commands[command];

    if (ids.length > 0) {
      const choices = this.createChoices(ids, names);
      const { container } = await this.prompt(question, choices);
      const id = container.split('-')[0].trim();

      switch (command) {
        case 'ssh': {
          this.ssh(id);
          break;
        }
        case 'env':
          this.spawn('docker', ['exec', '-ti', id, 'env']);
          break;
        default:
          this.spawn('docker', [command, ...flags, id]);
      }
    } else {
      throw new Error(error);
    }
  }

  public executeInParallel(command: string, type: Type) {
    info('Asynchronous execution of command is happening in the background...');
    info(`Some containers might take longer than others to ${command}...`);

    const { ids } = this.getDockerInfo(type)!;
    ids.forEach(id => {
      const child = spawn('docker', [command, id], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    });
  }

  public usage(command?: string) {
    if (!command) {
      const descriptions = this.generateCommandDescriptions();
      logAndForget(`NAME:
  \tsupdock - What's Up Dock(er)?

  USAGE:
  \tsupdock [global options] command [command options] [arguments...]

  VERSION:
  \t${version}

  COMMANDS:
  ${descriptions}
  \thelp, h\t\tShows a list of commands or help for one command

  GLOBAL OPTIONS:
  \t--help, -h\tshow help
  \t--version, -v\tprint the version
      `);
    } else {
      this.default();
      logAndForget(`\nCustom:\n${this.generateFlagDescriptions(command)}`);
    }
  }

  public version() {
    logAndForget(version);
  }

  public getCustomCommands() {
    return Object.keys(this.commands);
  }

  private generateCommandDescriptions() {
    const commands = Object.keys(this.commands);
    return commands
      .map(command => `\t${command}\t\t${this.commands[command].description}`)
      .join('\n');
  }

  private generateFlagDescriptions(command: string) {
    return this.commands[command].flags
      .map((flag: string) => `  ${flag}`)
      .join('\n');
  }

  private executeFullyDeclaredCommand(command: string): string[] {
    return execSync(command, { maxBuffer: 1024 * 10000 })
      .toString()
      .split('\n')
      .filter(line => line);
  }

  private getDockerInfo(type: Type) {
    const ids = this.executeFullyDeclaredCommand(IdCommands[type]);
    const names = this.executeFullyDeclaredCommand(NameCommands[type]);
    return { ids, names };
  }

  private createChoices(ids: string[], names: string[]) {
    return ids.map((id: string, index: number) => `${id} - ${names[index]}`);
  }

  private spawn(command: string, args: string[]) {
    spawn(command, args, { stdio: 'inherit' });
  }

  private ssh(id: string) {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'shell',
          message: 'Which shell is the container using?',
          choices: ['bash', 'ash'],
        },
      ])
      .then((shell: any) => {
        this.spawn('docker', ['exec', '-ti', id.trim(), shell.shell]);
      });
  }

  private prompt(message: string, choices: string[]): any {
    return inquirer.prompt([
      {
        type: 'list',
        name: 'container',
        message,
        choices,
      },
    ]);
  }
}

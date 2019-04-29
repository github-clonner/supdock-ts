import { execSync, spawnSync, spawn } from 'child_process';
import * as inquirer from 'inquirer';

const enum CommandAliasses {
  RUNNING_CONTAINER_NAMES = "docker ps |awk '{print $NF}' |tail -n +2",
  RUNNING_CONTAINER_IDS = "docker ps |awk '{print $1}' |tail -n +2",
  ALL_CONTAINER_NAMES = "docker ps -a |awk '{print $NF}' |tail -n +2",
  ALL_CONTAINER_IDS = "docker ps -a |awk '{print $1}' |tail -n +2",
  ALL_STOPPED_CONTAINER_NAMES = "docker ps -a |grep 'Exited' |awk '{print $NF}'",
  ALL_STOPPED_CONTAINER_IDS = "docker ps -a |grep 'Exited' |awk '{print $1}'",
  IMAGE_NAMES = "docker images |awk '{print $1}' |tail -n +2",
  IMAGE_IDS = "docker images |awk '{print $3}' |tail -n +2",
}

export default class Supdock {
  private executeFullyDeclaredCommand(command: string): string[] {
    return execSync(command, { maxBuffer: 1024 * 10000 })
      .toString()
      .split('\n')
      .filter(line => line);
  }

  private getNames(type: string) {
    switch (type) {
      case 'psa':
        return this.executeFullyDeclaredCommand(
          CommandAliasses.ALL_CONTAINER_NAMES,
        );
      case 'ps':
        return this.executeFullyDeclaredCommand(
          CommandAliasses.RUNNING_CONTAINER_NAMES,
        );
      case 'psaStopped':
        return this.executeFullyDeclaredCommand(
          CommandAliasses.ALL_STOPPED_CONTAINER_NAMES,
        );
      case 'images':
        return this.executeFullyDeclaredCommand(CommandAliasses.IMAGE_NAMES);
      default:
        return;
    }
  }

  private getIds(type: string) {
    switch (type) {
      case 'psa':
        return this.executeFullyDeclaredCommand(
          CommandAliasses.ALL_CONTAINER_IDS,
        );
      case 'ps':
        return this.executeFullyDeclaredCommand(
          CommandAliasses.RUNNING_CONTAINER_IDS,
        );
      case 'psaStopped':
        return this.executeFullyDeclaredCommand(
          CommandAliasses.ALL_STOPPED_CONTAINER_IDS,
        );
      case 'images':
        return this.executeFullyDeclaredCommand(CommandAliasses.IMAGE_IDS);
      default:
        return;
    }
  }

  private createChoices(ids: string[], names: string[]) {
    return ids.map((id: string, index: number) => `${id} - ${names[index]}`);
  }

  private spawn(command: string, args: string[]) {
    spawnSync(command, args, { stdio: 'inherit' });
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

  private prompt(question: string, choices: string[], command: string) {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'container',
          message: question,
          choices: choices,
        },
      ])
      .then((answers: any) => {
        const id = answers.container.split('-')[0].trim();
        switch (command) {
          case 'ssh': {
            this.ssh(id);
            break;
          }
          case 'stats':
            this.spawn('docker', [command, id, '--no-stream']);
            break;
          case 'env':
            this.spawn('docker', ['exec', '-ti', id, 'env']);
            break;
          default:
            this.spawn('docker', [command, id]);
        }
      });
  }

  public passthrough(options: string[] = process.argv.slice(2)) {
    this.spawn('docker', options);
  }

  public execute(
    command: string,
    question: string,
    error: string,
    type: string,
  ) {
    const ids = this.getIds(type)!;
    if (ids.length > 0) {
      const choices = this.createChoices(ids, this.getNames(type)!);
      this.prompt(question, choices, command);
    } else {
      throw new Error(error);
    }
  }

  public async executeInParallel(command: string, type: string) {
    const ids = this.getIds(type)!;
    return Promise.all(
      ids.map(id => {
        return new Promise(resolve => {
          resolve(spawn('docker', [command, id]));
        });
      }),
    );
  }
}

import { Command } from './index';
import { traceFunction, error, info } from 'helpers/util';

@traceFunction()
export default class Config extends Command {
  private type: string;

  constructor(type: string) {
    super(type);
    this.type = type;
  }

  public async run() {
    if (!this.args.nonFlags.length) {
      const { inactive, active } = this.config;
      if (
        (this.type === 'enable' && !inactive.length) ||
        (this.type === 'disable' && !active.length)
      ) {
        error(`No options found to ${this.type}`);
      }
      const { choice } = await this.prompt(
        `Which config value would you like to ${this.type}?`,
        this.type === 'enable' ? this.config.inactive : this.config.active,
      );
      this.args.nonFlags = [choice];
    }

    for (const key of this.args.nonFlags) {
      this.config.set(key, this.type === 'enable');
      info(
        `Config '${key}' ${this.type === 'enable' ? 'enabled' : 'disabled'}`,
      );
    }
  }
}

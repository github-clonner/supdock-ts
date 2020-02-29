import { spawnSync, execSync, spawn } from 'child_process';
import CommandType from 'interfaces/Command';
import { parseArguments } from 'helpers/args';
import flatten from 'lodash.flatten';
import metadata from 'metadata';
import ConfigOptions from 'enums/ConfigOptions';
import * as inquirer from 'inquirer';
import { error, traceFunction, exit, info, log } from 'helpers/util';
import FuzzySearch from 'fuzzy-search';
import Config from 'helpers/config';
import { generateCustomCommandDescription } from 'helpers/description';
import { version } from 'package';
import { parseOutput } from 'helpers/test';

export interface MockingConfig {
  createChoices?: () => string[];
  determineChoice?: () => string;
  parseFlags?: () => string[];
  prompt?: () => { choice: string };
  nonFlags?: string[];
}

interface Internal {
  createChoices: Function;
  determineChoice: Function;
  parseFlags: Function;
  prompt: Function;
}

@traceFunction()
export class Command {
  private command: string;
  private allowedFlags: string[];
  private metadata: CommandType;
  public internal: Internal;
  public mocking: boolean;
  public config: Config;
  public args: {
    command: any;
    flags: any;
    nonFlags: string[];
  };
  public id: string;
  public flags: string[];

  constructor(command: string, config?: MockingConfig) {
    // Metadata
    this.command = command;
    this.metadata = metadata[command];

    // Config
    this.config = new Config();
    this.config.migrate();

    // Mocking
    this.mocking = config !== undefined;
    this.internal = {
      parseFlags: this.mocking
        ? config?.parseFlags ||
          function() {
            return [];
          }
        : this.parseFlags.bind(this),
      createChoices: config?.createChoices || this.createChoices.bind(this),
      determineChoice:
        config?.determineChoice || this.determineChoice.bind(this),
      prompt: config?.prompt || this.prompt.bind(this),
    };

    // Flags
    this.args = parseArguments();
    this.args.nonFlags = config?.nonFlags || this.args.nonFlags;
    this.allowedFlags = flatten(this.metadata?.flags) || [];
    this.flags = this.internal.parseFlags(this.args.flags);
  }

  private parseFlags(flags: any) {
    const parsed: string[] = [];

    for (const flag of Object.keys(flags)) {
      // If prompt flag has been passed and is allowed for the command strip it from the further execution flags
      if (['p', 'prompt'].includes(flag) && this.allowedFlags.includes(flag)) {
        continue;
      }

      // Minimist parses --no-<flag> variables to a boolean flag with value false with the --no prefix stripped
      // So we have to readd the prefix
      if (this.allowedFlags.includes(`no-${flag}`) && !flags[flag]) {
        parsed.push(`--no-${flag}`);
        continue;
      }

      // Normal flag behaviour
      parsed.push(flag.length > 1 ? `--${flag}` : `-${flag}`);

      // If flag has a value that is not a boolean add it to the array
      if (typeof flags[flag] !== 'boolean') {
        parsed.push(flags[flag]);
      }
    }

    return parsed;
  }

  private createChoices() {
    return execSync(this.metadata.type!, { maxBuffer: 1024 * 10000 })
      .toString()
      .split('\n')
      .filter(line => line);
  }

  private async determineChoice(
    choices: string[],
  ): Promise<string | undefined> {
    const { question, allowFuzzySearching } = this.metadata;

    // Try to fuzzy match the given search term
    if (allowFuzzySearching && this.args.nonFlags.length === 1) {
      return await this.fuzzySearch(choices);
    }

    // Default behaviour just ask question and prompt for choice
    const { choice } = await this.prompt(question!, choices);
    return choice;
  }

  private fuzzySearch = async (choices: string[]) => {
    // When fuzzy searching is disabled make sure we passthrough back to docker so we don't hinder docker behaviour
    if (!this.config.get(ConfigOptions.FUZZY_SEARCH)) {
      this.default();
      exit();
    }

    let choice: string;
    const term = this.args.nonFlags[0];
    const choicesAfterFuzzySearching = new FuzzySearch(choices).search(term);
    if (choicesAfterFuzzySearching.length === 0) {
      error(
        `Was not able to match with container or image for search: ${term}`,
      );
    }

    switch (choicesAfterFuzzySearching.length) {
      case 1:
        // Check if the nonFlags passed completely match an id or name
        // We don't want to ask for confirmation in this case
        choice = choicesAfterFuzzySearching[0];
        if (
          (term === choice.split('-')[0].trim() ||
            term === choice.split('-')[1].trim() ||
            choice
              .split('-')[0]
              .trim()
              .startsWith(term)) &&
          !this.metadata.custom
        ) {
          this.default();
          exit();
        }

        // Ask the user for confirmation
        if (this.config.get(ConfigOptions.CAUTION_CHECK)) {
          const confirmation = await this.prompt(
            `Are you sure you want to execute '${this.command}' for container '${choice}'`,
            ['Yes', 'No'],
          );

          if (confirmation.choice === 'No') {
            error('Exiting on request of user...');
            exit();
          }
        }
        break;
      default:
        // Check if one of the choices match the search term
        if (
          choicesAfterFuzzySearching.find(
            choice =>
              (term === choice.split('-')[0].trim() ||
                term === choice.split('-')[1].trim() ||
                choice
                  .split('-')[0]
                  .trim()
                  .startsWith(term)) &&
              !this.metadata.custom,
          )
        ) {
          this.default();
          exit();
        }

        choice = (
          await this.prompt(
            `Search '${term}' returned more than one result, please make a choice from the list below.`,
            choicesAfterFuzzySearching,
          )
        ).choice;
    }

    return choice;
  };

  private parallel() {
    info('Asynchronous execution of command is happening in the background');
    info(
      `Some containers might take longer than others to ${this.command}`,
      true,
    );

    const ids: string[] = this.internal
      .createChoices()
      .map((choice: string) => choice.split('-')[0].trim());
    ids.forEach(id => {
      const child = spawn('docker', [this.command, id], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    });

    return ids;
  }

  public execute() {
    this.spawn('docker', [this.command, ...this.flags, this.id]);
  }

  public async run() {
    // Default docker command
    if (!this.metadata) {
      return this.default();
    }

    // Usage requested
    if (
      this.args.flags.help ||
      this.args.flags.h ||
      this.flags.includes('--help') ||
      this.flags.includes('-h')
    ) {
      return this.usage();
    }

    // Some commands allow passing 'all' as a valid option. eg. start, stop and restart.
    // These can bypass everything custom and just be fired early
    if (this.args.nonFlags.includes('all') && this.metadata.parallelExecution) {
      return this.parallel();
    }

    const choices = this.internal.createChoices();
    if (choices.length > 0) {
      // Extract the id from the choice that was made or given
      const choice = await this.internal.determineChoice(choices);

      // Unable to determine choice
      if (!choice) {
        return;
      }

      this.id = choice.split('-')[0].trim();
      return this.execute();
    }
  }

  public default(options: string[] = process.argv.slice(2)) {
    return this.spawn(
      'docker',
      this.mocking ? [this.command, ...this.flags] : options,
    );
  }

  public prompt(message: string, choices: string[]): any {
    return inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message,
        choices,
      },
    ]);
  }

  public spawn(command: string, args: string[]) {
    return this.mocking
      ? parseOutput(args)
      : spawnSync(command, args, { stdio: 'inherit' });
  }

  public usage() {
    const {
      custom,
      usage,
      description,
      options,
      extraUsageInfo,
    } = this.metadata;

    // When command has custom usage defined log that instead of throwing the unknown command to docker
    if (usage) {
      return this.spawn('docker', usage.split(' '));
    }

    // Allow commands to have their own detailed usage information when a complete custom command
    // Overwritten by usage alias above
    if (custom && !usage) {
      info(
        generateCustomCommandDescription(this.command, description, options),
      );
    }

    // When a standard docker command log the default docker usage info first
    if (!usage && !custom) {
      return this.default();
    }

    const generateFlagDescriptions = () => {
      const descriptions: string[] = [];
      if (this.metadata.flags) {
        for (const flag of this.metadata.flags!) {
          if (flag.length === 1) {
            descriptions.push(`      --${flag[0]}`);
          } else {
            descriptions.push(`  -${flag[0]}, --${flag[1]}`);
          }
        }
      }
      return descriptions.join('\n');
    };

    // Only log extra stuff if there are actual custom flags for the command
    const flagDescriptions = generateFlagDescriptions();
    if (flagDescriptions.length > 0) {
      info(
        `\nOptions supported through prompt (supdock):\n${flagDescriptions}`,
      );
      if (extraUsageInfo) {
        info(`\n${extraUsageInfo}`);
      }
    }

    return;
  }

  public version() {
    log(version);
  }
}

#!/usr/bin/env node
import Supdock from './src';
import { parseArguments } from './src/helpers/args';

const supdock = new Supdock();
const { command, flags, nonFlags } = parseArguments();

async function run() {
  if (flags.help || flags.h) {
    if (command) {
      supdock.usage(command);
    } else {
      supdock.usage();
    }
  }

  if (flags.version || flags.v) {
    supdock.version();
  }

  // Fallback to default Docker execution if command is unknown to Supdock
  if (!supdock.getCustomCommands().includes(command)) {
    supdock.default();
    return;
  }

  await supdock.run({ command, flags, nonFlags });
}

// tslint:disable-next-line: no-floating-promises
run();

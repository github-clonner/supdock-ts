import CommandAlias from './enums/commands';

export default {
  logs: {
    description: 'See the logs of a container',
    question: 'Which container would you like to see the logs of?',
    error: 'no containers to see the logs of',
    flags: [['-f', '--follow']],
    type: CommandAlias.ALL_CONTAINERS,
  },
  restart: {
    description: 'Restart a running container',
    question: 'Which container would you like to restart?',
    error: 'no containers available to restart',
    type: CommandAlias.RUNNING_CONTAINERS,
  },
  start: {
    description: 'Start a stopped container',
    question: 'Which container would you like to start?',
    error: 'no containers available to start',
    type: CommandAlias.STOPPED_CONTAINERS,
  },
  stop: {
    description: 'Stop a running container',
    question: 'Which container would you like to stop?',
    error: 'no containers available to stop',
    flags: [['-f', '--force']],
    type: CommandAlias.RUNNING_CONTAINERS,
  },
  ssh: {
    description: 'SSH into a container',
    question: 'Which container would you like to SSH to?',
    error: 'no containers available',
    type: CommandAlias.RUNNING_CONTAINERS,
  },
  env: {
    description: 'See the environment variables of a running container',
    question:
      'Which container would you like to see the environment variables of?',
    error: 'no containers running',
    type: CommandAlias.RUNNING_CONTAINERS,
  },
  rm: {
    description: 'Remove a container',
    question: 'Which container would you like to remove?',
    error: 'no containers to remove',
    type: CommandAlias.STOPPED_CONTAINERS,
  },
  rmi: {
    description: 'Remove an image',
    question: 'Which image would you like to remove?',
    error: 'no images to remove',
    type: CommandAlias.IMAGES,
  },
  history: {
    description: 'See the history of an image',
    question: 'Which image would you like to see the history of?',
    error: 'no images available',
    type: CommandAlias.ALL_CONTAINERS,
  },
  stats: {
    description: 'See the stats of a container',
    question: 'Which containers would you like to see that stats of?',
    error: 'no containers available',
    flags: [['-p', '--prompt']],
    type: CommandAlias.RUNNING_CONTAINERS,
  },
  inspect: {
    description: 'Inspect a container',
    question: 'Which image would you like to inspect?',
    error: 'no containers to inspect',
    type: CommandAlias.ALL_CONTAINERS,
  },
  prune: {
    description:
      "Remove stopped containers and dangling images. For more detailed usage refer to 'docker system prune -h'",
  },
};

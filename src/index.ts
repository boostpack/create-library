// Main entry point for create-library
export { buildScript } from './scripts/build';
export { testScript } from './scripts/test';
export { lintScript } from './scripts/lint';
export { formatScript } from './scripts/format';
export { ejectScript } from './scripts/eject';
export { createBoostpackLibScript } from './scripts/create';

export type { BuildCommandOptions } from './scripts/build';
export type { TestCommandOptions } from './scripts/test';
export type { LintCommandOptions } from './scripts/lint';
export type { FormatCommandOptions } from './scripts/format';
export type { EjectCommandOptions } from './scripts/eject';
export type { CreateCommandOptions } from './scripts/create';

export type {
  CommandContext,
  CommandDefinition,
  CommandHooks,
  CommandOptionDefinition,
  BoostpackScriptsConfig,
  CommandHandler,
} from './core/types';

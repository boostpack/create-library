#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { BoostpackScriptsConfig, CommandContext, CommandDefinition, CommandOptionDefinition } from './core/types';
import { createCommandRegistry } from './core/command-registry';
import { createLogger } from './core/logger';
import { buildScript, type BuildCommandOptions } from './scripts/build';
import { testScript, type TestCommandOptions } from './scripts/test';
import { lintScript, type LintCommandOptions } from './scripts/lint';
import { formatScript, type FormatCommandOptions } from './scripts/format';
import { ejectScript, type EjectCommandOptions } from './scripts/eject';
import { createBoostpackLibScript, type CreateCommandOptions } from './scripts/create';

const require = createRequire(import.meta.url);
const pkg = require(path.resolve(__dirname, '../../package.json')) as { version: string; description?: string };

type AnyOptions = Record<string, unknown>;

interface RegistrationOptions<TOptions extends AnyOptions> {
  program: Command;
  definition: CommandDefinition<TOptions>;
  userConfig?: BoostpackScriptsConfig;
  rawArgs: string[];
}

function applyOption(command: Command, option: CommandOptionDefinition) {
  if (option.argParser) {
    if (option.defaultValue !== undefined) {
      command.option(option.flags, option.description, option.argParser, option.defaultValue as never);
    } else {
      command.option(option.flags, option.description, option.argParser);
    }

    return;
  }

  if (option.defaultValue !== undefined) {
    command.option(option.flags, option.description, option.defaultValue as never);

    return;
  }

  command.option(option.flags, option.description);
}

function addAliases<TOptions extends AnyOptions>(command: Command, definition: CommandDefinition<TOptions>) {
  if (definition.aliases?.length) {
    for (const alias of definition.aliases) {
      command.alias(alias);
    }
  }
}

function addArguments<TOptions extends AnyOptions>(command: Command, definition: CommandDefinition<TOptions>) {
  if (definition.arguments) {
    for (const arg of definition.arguments) {
      if (arg.defaultValue !== undefined) {
        command.argument(arg.name, arg.description ?? '', arg.defaultValue);
      } else {
        command.argument(arg.name, arg.description ?? '');
      }
    }
  }
}

function addOptions<TOptions extends AnyOptions>(command: Command, definition: CommandDefinition<TOptions>) {
  if (definition.options) {
    for (const option of definition.options) {
      applyOption(command, option);
    }
  }
}

function addExamples<TOptions extends AnyOptions>(command: Command, definition: CommandDefinition<TOptions>) {
  if (definition.examples?.length) {
    const exampleText = definition.examples.map((example) => `  $ ${example}`).join('\n');
    command.addHelpText('after', `\nExamples:\n${exampleText}\n`);
  }
}

function configureCommand<TOptions extends AnyOptions>(command: Command, definition: CommandDefinition<TOptions>) {
  addAliases(command, definition);

  if (definition.summary) {
    command.summary(definition.summary);
  }

  command.description(definition.description);

  addArguments(command, definition);
  addOptions(command, definition);

  if (definition.allowUnknownOptions) {
    command.allowUnknownOption(true);
  }

  if (definition.allowPassThrough) {
    command.passThroughOptions(true);
    command.allowUnknownOption(true);
  }

  addExamples(command, definition);
}

function buildCommandContext<TOptions extends AnyOptions>(
  actionArgs: unknown[],
  definition: CommandDefinition<TOptions>,
  userConfig: BoostpackScriptsConfig | undefined,
  rawArgs: string[],
): CommandContext<TOptions> {
  const instance = actionArgs[actionArgs.length - 1] as Command;
  const cliOptions = instance.opts();

  const positionalArgs = actionArgs.slice(0, actionArgs.length - 1) as string[];
  const rawArgsForCommand = instance.args ?? [];
  const passThroughArgs = definition.allowPassThrough ? rawArgsForCommand.slice(positionalArgs.length) : [];

  const defaultsFromDefinition = (definition.defaultOptions ?? {}) as Partial<TOptions>;
  const defaultsFromUser = (userConfig?.defaults?.[definition.name] ?? {}) as Partial<TOptions>;

  const options = {
    ...defaultsFromDefinition,
    ...defaultsFromUser,
    ...cliOptions,
  } as TOptions;

  const logger = createLogger();
  const context: CommandContext<TOptions> = {
    cwd: process.cwd(),
    commandName: definition.name,
    options,
    args: positionalArgs,
    passThroughArgs,
    rawCommandLine: rawArgs,
    env: process.env,
    logger,
  };

  if (userConfig) {
    context.userConfig = userConfig;
  }

  return context;
}

async function executeWithHooks<TOptions extends AnyOptions>(
  definition: CommandDefinition<TOptions>,
  context: CommandContext<TOptions>,
  hooks: BoostpackScriptsConfig['hooks'],
) {
  try {
    if (hooks?.beforeAll) {
      await hooks.beforeAll(definition.name, context);
    }

    if (hooks?.beforeEach) {
      await hooks.beforeEach(definition.name, context);
    }

    await definition.handler(context);
  } catch (error) {
    if (hooks?.onError) {
      await hooks.onError(definition.name, context, error);
    }

    context.logger.error('Command failed', error);
    process.exitCode = 1;
  } finally {
    if (hooks?.afterEach) {
      await hooks.afterEach(definition.name, context);
    }

    if (hooks?.afterAll) {
      await hooks.afterAll(definition.name, context);
    }
  }
}

function registerCommand<TOptions extends AnyOptions>({
  program,
  definition,
  userConfig,
  rawArgs,
}: RegistrationOptions<TOptions>) {
  const command = program.command(definition.name, definition.isDefault ? { isDefault: true } : undefined);

  configureCommand(command, definition);

  command.action(async (...actionArgs: unknown[]) => {
    const context = buildCommandContext(actionArgs, definition, userConfig, rawArgs);
    const hooks = userConfig?.hooks;

    await executeWithHooks(definition, context, hooks);
  });
}

async function run(rawArgs: string[]) {
  const program = new Command();

  program
    .name('create-library')
    .description(pkg.description ?? 'Build scripts and dependencies for Boostpack TypeScript libraries')
    .version(pkg.version)
    .enablePositionalOptions();

  const registry = createCommandRegistry();

  const builtInCommands: CommandDefinition[] = [
    {
      name: 'init',
      isDefault: true,
      summary: 'Initialize a new Boostpack TypeScript library project',
      description: 'Generate a new library project using the Boostpack conventions and preconfigured tooling.',
      arguments: [],
      options: [
        { flags: '--name <package-name>', description: 'NPM package name to use' },
        { flags: '--directory <package-name>', description: 'Target directory for the new project' },
        { flags: '--template <template>', description: 'Template to use)' },
        {
          flags: '--package-manager <manager>',
          description: 'Package manager to use for installing dependencies (npm, pnpm, yarn)',
        },
        { flags: '--skip-install', description: 'Skip installing dependencies after scaffolding' },
        { flags: '--force', description: 'Allow scaffolding into a non-empty directory' },
        {
          flags: '--ci <provider>',
          description: 'CI provider to scaffold (github, gitlab, none). Defaults to github.',
        },
        {
          flags: '--npm-registry <type>',
          description: 'Target npm registry type (public or private). Defaults to public.',
        },
        {
          flags: '--npm-registry-url <url>',
          description: 'Registry URL to use when publishing to a private registry.',
        },
        {
          flags: '--gitlab-project-registry',
          description: 'For GitLab CI, publish using the current project package registry.',
        },
      ],
      examples: [
        'create-library init awesome-lib',
        'create-library init my-lib --package-manager pnpm',
        'create-library init pkg --ci gitlab --npm-registry private --gitlab-project-registry',
      ],
      handler: (context) => createBoostpackLibScript(context as CommandContext<CreateCommandOptions>),
    },
    {
      name: 'build',
      summary: 'Compile TypeScript and bundle with Rollup',
      description: 'Compile the library TypeScript sources and produce bundles using Rollup.',
      allowPassThrough: true,
      defaultOptions: {
        clean: true,
      },
      options: [
        { flags: '--watch', description: 'Run the TypeScript compiler in watch mode' },
        { flags: '--no-clean', description: 'Skip cleaning the dist directory before building' },
        {
          flags: '--rollup-config <path>',
          description: 'Path to a custom Rollup configuration file',
        },
        {
          flags: '--tsconfig <path>',
          description: 'Path to a custom tsconfig file for building',
        },
      ],
      examples: ['create-library build -- --environment production'],
      handler: (context) => buildScript(context as CommandContext<BuildCommandOptions>),
    },
    {
      name: 'test',
      summary: 'Run Jest test suites',
      description: 'Execute unit tests with Jest with support for watch, coverage, and CI reporters.',
      allowPassThrough: true,
      options: [
        { flags: '--watch', description: 'Run tests in watch mode' },
        { flags: '--coverage', description: 'Collect code coverage while running tests' },
        { flags: '--ci <platform>', description: 'Enable CI-specific behaviors (github or gitlab)' },
        { flags: '--config <path>', description: 'Path to a custom Jest configuration file' },
      ],
      handler: (context) => testScript(context as CommandContext<TestCommandOptions>),
    },
    {
      name: 'lint',
      summary: 'Run ESLint against the project sources',
      description: 'Lint project files using ESLint with support for custom config and CI modes.',
      allowPassThrough: true,
      options: [
        { flags: '--fix', description: 'Automatically fix lint issues when possible' },
        { flags: '--ci <platform>', description: 'Enable CI-specific linting behavior (github or gitlab)' },
        { flags: '--config <path>', description: 'Path to a custom ESLint configuration file' },
      ],
      handler: (context) => lintScript(context as CommandContext<LintCommandOptions>),
    },
    {
      name: 'format',
      summary: 'Format source files with Prettier',
      description: 'Run Prettier to format project files or check formatting status.',
      allowPassThrough: true,
      defaultOptions: {
        pattern: 'src/**/*.{ts,tsx,js,jsx,json,md}',
      },
      options: [
        { flags: '--check', description: 'Check formatting without writing changes' },
        {
          flags: '--pattern <glob>',
          description: 'File glob to pass to Prettier (defaults to src/**/*.{ts,tsx,js,jsx,json,md})',
        },
      ],
      handler: (context) => formatScript(context as CommandContext<FormatCommandOptions>),
    },
    {
      name: 'eject',
      summary: 'Copy the base config into the current project',
      description: 'Copy the maintained Boostpack configuration files into your project for customization.',
      options: [
        { flags: '--force', description: 'Overwrite existing files instead of aborting on conflicts' },
        { flags: '--dry-run', description: 'Preview the eject changes without writing files' },
        { flags: '--skip-install', description: 'Do not run package manager install after ejecting files' },
        { flags: '--yes', description: 'Skip interactive confirmations (future use)' },
        {
          flags: '--ci-platform <platform>',
          description:
            'CI platform to generate config for (github, gitlab, none). Auto-detected from package.json if not specified.',
        },
        {
          flags: '--package-manager <manager>',
          description: 'Package manager to use (npm, pnpm, yarn). Auto-detected if not specified.',
        },
      ],
      examples: [
        'create-library eject',
        'create-library eject --ci-platform gitlab --package-manager pnpm',
        'create-library eject --dry-run',
      ],
      handler: (context) => ejectScript(context as CommandContext<EjectCommandOptions>),
    },
  ];

  for (const definition of builtInCommands) {
    registry.add(definition);
  }

  const definitions = registry.list();

  for (const definition of definitions) {
    const registration: RegistrationOptions<Record<string, unknown>> = {
      program,
      definition,
      rawArgs,
    };

    registerCommand(registration);
  }

  try {
    await program.parseAsync(rawArgs);
  } catch (error) {
    const logger = createLogger();
    logger.error('Command execution failed', error);

    process.exitCode = process.exitCode ?? 1;
  }
}

run(process.argv).catch((error) => {
  const logger = createLogger();
  logger.error('Unexpected CLI failure', error);

  process.exit(1);
});

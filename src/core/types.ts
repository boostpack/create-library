export interface Logger {
  info: (...messages: unknown[]) => void;
  warn: (...messages: unknown[]) => void;
  error: (...messages: unknown[]) => void;
  success: (...messages: unknown[]) => void;
  verbose: (...messages: unknown[]) => void;
}

export interface CommandContext<TOptions extends Record<string, unknown> = Record<string, unknown>> {
  cwd: string;
  commandName: string;
  options: TOptions;
  args: string[];
  passThroughArgs: string[];
  rawCommandLine: string[];
  env: NodeJS.ProcessEnv;
  logger: Logger;
  userConfig?: BoostpackScriptsConfig;
}

export type CommandHandler<TOptions extends Record<string, unknown> = Record<string, unknown>> = (
  context: CommandContext<TOptions>,
) => Promise<void> | void;

export interface CommandOptionDefinition {
  flags: string;
  description: string;
  defaultValue?: unknown;
  argParser?: (value: string, previous?: unknown) => unknown;
}

export interface CommandDefinition<TOptions extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  summary?: string;
  description: string;
  examples?: string[];
  aliases?: string[];
  arguments?: CommandArgumentDefinition[];
  options?: CommandOptionDefinition[];
  allowUnknownOptions?: boolean;
  allowPassThrough?: boolean;
  defaultOptions?: Partial<TOptions>;
  isDefault?: boolean;
  handler: CommandHandler<TOptions>;
}

export interface CommandArgumentDefinition {
  name: string;
  description?: string;
  defaultValue?: string;
}

export interface CommandHooks {
  beforeAll?: (name: string, context: CommandContext) => Promise<void> | void;
  afterAll?: (name: string, context: CommandContext) => Promise<void> | void;
  beforeEach?: (name: string, context: CommandContext) => Promise<void> | void;
  afterEach?: (name: string, context: CommandContext) => Promise<void> | void;
  onError?: (name: string, context: CommandContext, error: unknown) => Promise<void> | void;
}

export interface CommandRegistryAdapter {
  has: (name: string) => boolean;
  add: <TOptions extends Record<string, unknown>>(definition: CommandDefinition<TOptions>) => void;
  override: <TOptions extends Record<string, unknown>>(name: string, updater: CommandUpdater<TOptions>) => void;
}

export type CommandUpdater<TOptions extends Record<string, unknown>> = (
  current: CommandDefinition<TOptions>,
) => CommandDefinition<TOptions>;

export interface BoostpackScriptsConfig {
  extend?: (registry: CommandRegistryAdapter) => Promise<void> | void;
  hooks?: CommandHooks;
  defaults?: Record<string, Record<string, unknown>>;
}

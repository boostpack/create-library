import { CommandDefinition, CommandRegistryAdapter } from './types';

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  add<TOptions extends Record<string, unknown>>(definition: CommandDefinition<TOptions>) {
    this.commands.set(definition.name, definition as CommandDefinition);
  }

  override<TOptions extends Record<string, unknown>>(
    name: string,
    updater: (current: CommandDefinition<TOptions>) => CommandDefinition<TOptions>,
  ) {
    const current = this.commands.get(name) as CommandDefinition<TOptions> | undefined;

    if (!current) {
      throw new Error(`Cannot override command "${name}" because it does not exist.`);
    }

    const updated = updater(current);
    this.commands.set(name, updated as CommandDefinition);
  }

  has(name: string) {
    return this.commands.has(name);
  }

  get(name: string) {
    return this.commands.get(name);
  }

  list() {
    return Array.from(this.commands.values());
  }

  adapter(): CommandRegistryAdapter {
    return {
      has: (name: string) => this.has(name),
      add: (definition) => {
        this.add(definition);
      },
      override: (name, updater) => {
        this.override(name, updater);
      },
    };
  }
}

export function createCommandRegistry() {
  return new CommandRegistry();
}

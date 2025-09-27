/* eslint-disable no-console */
import chalk from 'chalk';
import type { Logger } from './types';

export function createLogger(): Logger {
  return {
    info: (...messages: unknown[]) => console.log(...messages),
    warn: (...messages: unknown[]) => console.warn(chalk.yellow(...messages)),
    error: (...messages: unknown[]) => console.error(chalk.red(...messages)),
    success: (...messages: unknown[]) => console.log(chalk.green(...messages)),
    verbose: (...messages: unknown[]) => console.debug(chalk.cyan(...messages)),
  };
}

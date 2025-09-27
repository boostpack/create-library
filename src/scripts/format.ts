import { runCommand } from '../core/process';
import type { CommandContext } from '../core/types';

export interface FormatCommandOptions extends Record<string, unknown> {
  check?: boolean;
  pattern?: string;
}

export function formatScript(context: CommandContext<FormatCommandOptions>) {
  const { cwd, options, logger, passThroughArgs } = context;
  const pattern = options.pattern ?? 'src/**/*.{ts,tsx,js,jsx,json,md}';

  logger.info('💅 Formatting code...');

  const prettierArgs = [pattern];

  if (options.check) {
    prettierArgs.push('--check');
  } else {
    prettierArgs.push('--write');
  }

  runCommand('prettier', [...prettierArgs, ...passThroughArgs], {
    cwd,
  });

  if (options.check) {
    logger.success('✅ Code is properly formatted!');
  } else {
    logger.success('✅ Code formatted successfully!');
  }
}

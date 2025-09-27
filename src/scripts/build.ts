import path from 'path';
import fs from 'fs';
import { runCommand } from '../core/process';
import { resolveConfigPath } from '../core/config-resolver';
import type { CommandContext } from '../core/types';

export interface BuildCommandOptions extends Record<string, unknown> {
  watch?: boolean;
  clean?: boolean;
  rollupConfig?: string;
  tsconfig?: string;
}

export function buildScript(context: CommandContext<BuildCommandOptions>) {
  const { cwd, options, logger, passThroughArgs } = context;
  const shouldClean = options.clean !== false;
  const distPath = path.join(cwd, 'dist');

  logger.info('🔨 Building TypeScript library...');

  if (shouldClean && fs.existsSync(distPath)) {
    logger.verbose('Cleaning dist directory...');
    runCommand('rimraf', ['dist'], { cwd });
  }

  const tsconfigPath = resolveConfigPath({
    cwd,
    ...(options.tsconfig ? { customPath: options.tsconfig } : {}),
    projectRelativePath: 'tsconfig.build.json',
    packagedRelativePath: '../config/tsconfig.build.json',
    baseDir: __dirname,
  });

  logger.verbose(`Type checking with ${path.relative(cwd, tsconfigPath)}`);
  const tscArgs = ['-p', tsconfigPath];

  if (!options.watch) {
    tscArgs.push('--noEmit');
  } else {
    tscArgs.push('--watch');
  }

  runCommand('tsc', tscArgs, { cwd });

  if (options.watch) {
    // When watching we only run tsc
    return;
  }

  const rollupConfigPath = resolveConfigPath({
    cwd,
    ...(options.rollupConfig ? { customPath: options.rollupConfig } : {}),
    projectRelativePath: 'rollup.config.mjs',
    packagedRelativePath: '../config/rollup.config.mjs',
    baseDir: __dirname,
  });

  logger.verbose(`Bundling with ${path.relative(cwd, rollupConfigPath)}`);

  runCommand('rollup', ['-c', rollupConfigPath, ...passThroughArgs], {
    cwd,
  });

  logger.success('✅ Build completed successfully!');
}

import path from 'path';
import fs from 'fs/promises';
import { runCommand } from '../core/process';
import { resolveConfigPath } from '../core/config-resolver';
import type { CommandContext } from '../core/types';

export interface LintCommandOptions extends Record<string, unknown> {
  fix?: boolean;
  config?: string;
  ci?: string;
}

function detectCiProvider(env: NodeJS.ProcessEnv): 'github' | 'gitlab' | undefined {
  if (env['GITHUB_ACTIONS'] === 'true') {
    return 'github';
  }

  if (env['GITLAB_CI'] === 'true') {
    return 'gitlab';
  }

  return undefined;
}

export async function lintScript(context: CommandContext<LintCommandOptions>) {
  const { cwd, options, logger, passThroughArgs, env: contextEnv } = context;

  logger.info('🔍 Linting code...');

  const configPath = resolveConfigPath({
    cwd,
    ...(options.config ? { customPath: options.config } : {}),
    projectRelativePath: 'eslint.config.js',
    packagedRelativePath: '../config/eslint.config.js',
    baseDir: __dirname,
  });

  const baseArgs = ['.', '--config', configPath];

  if (options.fix) {
    baseArgs.push('--fix');
  }

  const env = { ...process.env, ...contextEnv };
  const ciProvider = options.ci ?? detectCiProvider(env);

  if (ciProvider === 'github') {
    env['CI'] = 'true';
    env['GITHUB_ACTIONS'] = env['GITHUB_ACTIONS'] ?? 'true';

    runCommand('eslint', [...baseArgs, '--format', 'github', ...passThroughArgs], {
      cwd,
      env,
    });

    logger.success('✅ Linting passed!');

    return;
  }

  runCommand('eslint', [...baseArgs, ...passThroughArgs], {
    cwd,
    env,
  });

  if (ciProvider === 'gitlab') {
    env['CI'] = 'true';
    env['GITLAB_CI'] = env['GITLAB_CI'] ?? 'true';
    const reportsDir = path.join(cwd, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    runCommand(
      'eslint',
      [
        ...baseArgs,
        '--format',
        'junit',
        '--output-file',
        path.join(reportsDir, 'eslint-junit.xml'),
        ...passThroughArgs,
      ],
      {
        cwd,
        env,
      },
    );

    const codeQualityPath = path.join(cwd, 'gl-codequality.json');
    await fs.writeFile(codeQualityPath, '[]\n', 'utf8');
  }

  logger.success('✅ Linting passed!');
}

import path from 'path';
import fs from 'fs/promises';
import { createRequire } from 'module';
import { runCommand } from '../core/process';
import { resolveConfigPath } from '../core/config-resolver';
import type { CommandContext } from '../core/types';

export interface TestCommandOptions extends Record<string, unknown> {
  watch?: boolean;
  coverage?: boolean;
  ci?: string;
  config?: string;
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

export async function testScript(context: CommandContext<TestCommandOptions>) {
  const { cwd, options, logger, passThroughArgs, env: contextEnv } = context;

  logger.info('🧪 Running tests...');

  const configPath = resolveConfigPath({
    cwd,
    ...(options.config ? { customPath: options.config } : {}),
    projectRelativePath: 'jest.config.js',
    packagedRelativePath: '../config/jest.config.js',
    baseDir: __dirname,
  });

  const jestArgs = ['--config', configPath];

  if (options.coverage) {
    jestArgs.push('--coverage');
  }

  if (options.watch) {
    jestArgs.push('--watch');
  }

  const env = { ...process.env, ...contextEnv };
  const ciProvider = options.ci ?? detectCiProvider(env);

  if (ciProvider) {
    env['CI'] = 'true';
    jestArgs.push('--ci');
    jestArgs.push('--reporters', 'default');

    if (ciProvider === 'github') {
      env['GITHUB_ACTIONS'] = env['GITHUB_ACTIONS'] ?? 'true';
      jestArgs.push('--reporters', 'github-actions');
    } else if (ciProvider === 'gitlab') {
      env['GITLAB_CI'] = env['GITLAB_CI'] ?? 'true';
      const reportsDir = path.join(cwd, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      const junitReporterAvailable = (() => {
        try {
          const projectRequire = createRequire(path.join(cwd, 'package.json'));
          projectRequire.resolve('jest-junit');

          return true;
        } catch {
          return false;
        }
      })();

      if (junitReporterAvailable) {
        env['JEST_JUNIT_OUTPUT_DIR'] = reportsDir;
        env['JEST_JUNIT_OUTPUT_NAME'] = 'jest-junit.xml';
        jestArgs.push('--reporters', 'jest-junit');
      } else {
        logger.warn(
          'Install "jest-junit" to produce GitLab-compatible JUnit reports. Falling back to default reporter.',
        );
      }
    } else {
      logger.warn(`Unknown CI platform: ${ciProvider}. Using default reporter.`);
    }
  }

  runCommand('jest', [...jestArgs, ...passThroughArgs], {
    cwd,
    env,
  });

  logger.success('✅ Tests passed!');
}

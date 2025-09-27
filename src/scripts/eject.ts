import fs from 'fs/promises';
import path from 'path';
import type { CommandContext } from '../core/types';
import { runCommand } from '../core/process';
import { PackageManager, TemplateEngine } from '../core/template-engine';
import { getToolPackageInfo } from '../core/package-info';

export interface EjectCommandOptions extends Record<string, unknown> {
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  skipInstall?: boolean;
  ciPlatform?: 'github' | 'gitlab' | 'none';
  packageManager?: PackageManager;
}

interface FileCopyDescriptor {
  source: string;
  target: string;
}

function mergeScripts(existing: Record<string, string>, incoming: Record<string, string>, force: boolean) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (force || !merged[key]) {
      merged[key] = value;
    }
  }

  return merged;
}

const filesToCopy: FileCopyDescriptor[] = [
  { source: 'config/commitlint.config.js', target: 'eslint.config.js' },
  { source: 'config/eslint.config.js', target: 'eslint.config.js' },
  { source: 'config/jest.config.js', target: 'jest.config.js' },
  { source: 'config/prettier.config.js', target: 'prettier.config.js' },
  { source: 'config/release.config.js', target: 'release.config.js' },
  { source: 'config/renovate.config.js', target: 'renovate.config.js' },
  { source: 'config/rollup.config.mjs', target: 'rollup.config.mjs' },
  { source: 'config/tsconfig.json', target: 'tsconfig.json' },
  { source: 'config/tsconfig.build.json', target: 'tsconfig.build.json' },
  { source: 'config/tsconfig.test.json', target: 'tsconfig.test.json' },
];

const packageJsonScripts: Record<string, string> = {
  build: 'create-library build',
  lint: 'create-library lint',
  'lint:ci': 'create-library lint --format json > gl-codequality.json',
  test: 'create-library test',
  'test:watch': 'create-library test --watch',
  'test:ci': 'create-library test --ci',
  format: 'create-library format',
  'format:check': 'create-library format --check',
  'semantic-release': 'semantic-release',
};

const packageRoot = path.resolve(__dirname, '../../../');

async function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(
  { source, target }: FileCopyDescriptor,
  cwd: string,
  dryRun: boolean,
  logger: CommandContext['logger'],
) {
  const absoluteSource = path.resolve(packageRoot, source);
  const absoluteTarget = path.join(cwd, target);

  if (dryRun) {
    logger.verbose(`[dry-run] copy ${path.relative(cwd, absoluteSource)} -> ${target}`);

    return;
  }

  await ensureDirectory(absoluteTarget);
  await fs.copyFile(absoluteSource, absoluteTarget);
  logger.verbose(`Copied ${target}`);
}

async function loadPackageJson(cwd: string) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const raw = await fs.readFile(packageJsonPath, 'utf8');

  return { path: packageJsonPath, data: JSON.parse(raw) as Record<string, unknown> };
}

async function savePackageJson(
  packagePath: string,
  data: Record<string, unknown>,
  dryRun: boolean,
  logger: CommandContext['logger'],
) {
  if (dryRun) {
    logger.verbose('[dry-run] package.json would be updated');

    return;
  }

  const pretty = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(packagePath, pretty, 'utf8');
  logger.verbose('package.json updated');
}

async function updatePackageJson(cwd: string, options: EjectCommandOptions, logger: CommandContext['logger']) {
  try {
    const { path: packagePath, data } = await loadPackageJson(cwd);

    data['scripts'] = mergeScripts(
      (data['scripts'] ?? {}) as Record<string, string>,
      packageJsonScripts,
      options.force ?? false,
    );

    const devDeps = { ...((data['devDependencies'] ?? {}) as Record<string, string>) };
    const { packageName, packageVersion } = await getToolPackageInfo(packageRoot);
    const expectedVersion = `^${packageVersion}`;

    if (options.force || !devDeps[packageName]) {
      devDeps[packageName] = expectedVersion;
    }

    data['devDependencies'] = devDeps;

    await savePackageJson(packagePath, data, options.dryRun ?? false, logger);
  } catch (error) {
    logger.warn('Skipping package.json updates:', error as Error);
  }
}

async function hasConflicts(cwd: string, descriptors: FileCopyDescriptor[]) {
  const conflicts: string[] = [];
  for (const { target } of descriptors) {
    const dest = path.join(cwd, target);
    try {
      // eslint-disable-next-line no-await-in-loop
      await fs.access(dest);
      conflicts.push(target);
    } catch {
      // ignore missing files
    }
  }

  return conflicts;
}

async function detectCiPlatform(
  cwd: string,
  optionsCiPlatform: string | undefined,
  logger: CommandContext['logger'],
): Promise<string> {
  let ciPlatform = optionsCiPlatform;

  try {
    const { data: packageJson } = await loadPackageJson(cwd);

    // Auto-detect CI platform from package.json if not specified
    if (!ciPlatform) {
      const boostpack = packageJson['boostpack'] as Record<string, unknown> | undefined;
      if (boostpack && typeof boostpack === 'object' && boostpack['ci']) {
        ciPlatform = boostpack['ci'] as string;
        logger.verbose(`Detected CI platform from package.json: ${ciPlatform}`);
      } else {
        ciPlatform = 'none';
      }
    }
  } catch {
    // Use default to 'none'
    if (!ciPlatform) {
      ciPlatform = 'none';
    }
  }

  return ciPlatform;
}

async function ejectCIConfigs(context: CommandContext<EjectCommandOptions>, packageManager: PackageManager) {
  const { cwd, logger, options } = context;
  const templateEngine = new TemplateEngine();
  const dryRun = options.dryRun ?? false;

  const templateContext = {
    packageManager,
    projectName: path.basename(cwd),
  };

  try {
    const { data: packageJson } = await loadPackageJson(cwd);
    if (packageJson['name']) {
      templateContext.projectName = packageJson['name'] as string;
    }
  } catch {
    // Use default project name from cwd
  }

  const ciPlatform = await detectCiPlatform(cwd, options.ciPlatform, logger);

  if (ciPlatform === 'none') {
    logger.verbose('Skipping CI configuration generation');

    return;
  }

  // Generate GitHub Actions workflow
  if (ciPlatform === 'github') {
    const githubDir = path.join(cwd, '.github', 'workflows');
    const githubCIPath = path.join(githubDir, 'ci.yml');

    if (dryRun) {
      logger.verbose('[dry-run] would generate .github/workflows/ci.yml');
    } else {
      await ensureDirectory(githubCIPath);
      await templateEngine.renderToFile('ci/github/ci.yml.eta', githubCIPath, templateContext);

      logger.success('✅ Generated GitHub Actions workflow');
    }
  }

  // Generate GitLab CI configuration
  if (ciPlatform === 'gitlab') {
    const gitlabCIPath = path.join(cwd, '.gitlab-ci.yml');

    if (dryRun) {
      logger.verbose('[dry-run] would generate .gitlab-ci.yml');
    } else {
      await templateEngine.renderToFile('ci/gitlab/gitlab-ci.yml.eta', gitlabCIPath, templateContext);

      logger.success('✅ Generated GitLab CI configuration');
    }
  }
}

export async function ejectScript(context: CommandContext<EjectCommandOptions>) {
  const { cwd, logger, options } = context;
  const dryRun = options.dryRun ?? false;
  const force = options.force ?? false;

  logger.info('📦 Ejecting Boostpack base configuration into project...');

  // Detect package manager
  const packageManager = options.packageManager || (await TemplateEngine.detectPackageManager(cwd));

  logger.verbose(`Detected package manager: ${packageManager}`);

  // Check for config file conflicts
  const conflicts = await hasConflicts(cwd, filesToCopy);
  if (conflicts.length > 0 && !force) {
    logger.error(
      `Cannot eject because the following files already exist:\n${conflicts
        .map((file) => `  • ${file}`)
        .join('\n')}\nUse --force to overwrite or remove the files manually.`,
    );

    throw new Error('Eject aborted due to existing files.');
  }

  // Copy configuration files
  for (const descriptor of filesToCopy) {
    // eslint-disable-next-line no-await-in-loop
    await copyFile(descriptor, cwd, dryRun, logger);
  }

  // Update package.json
  await updatePackageJson(cwd, options, logger);

  // Generate CI configurations
  await ejectCIConfigs(context, packageManager);

  // Install dependencies
  if (!(options.skipInstall ?? false)) {
    try {
      logger.verbose('Ensuring dependencies are installed...');
      if (!dryRun) {
        const commands = TemplateEngine.getPackageManagerCommands(packageManager);
        const [cmd, ...args] = commands.install.split(' ');
        if (!cmd) {
          throw new Error(`Cannot install dependencies due to missing package manager commands.`);
        }

        runCommand(cmd, args, { cwd });
      } else {
        logger.verbose(`[dry-run] ${packageManager} install`);
      }
    } catch (error) {
      logger.warn(`${packageManager} install failed. Please install dependencies manually.`, error);
    }
  }

  logger.success('✅ Eject completed! You can now customize the copied configuration files.');

  if (!options.ciPlatform || options.ciPlatform === 'none') {
    return;
  }

  logger.info('💡 CI/CD configuration files have been generated.');
  logger.info('   Remember to configure the required secrets in your CI/CD platform:');
  logger.info('   - NPM_TOKEN (for package publishing)');

  if (options.ciPlatform === 'github') {
    logger.info('   - CODECOV_TOKEN (for coverage reporting, optional)');
  }
}

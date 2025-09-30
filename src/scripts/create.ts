import fs from 'node:fs/promises';
import path from 'node:path';
import { input, select, confirm } from '@inquirer/prompts';
import { Eta } from 'eta';
import { runCommand } from '../core/process';
import type { CommandContext } from '../core/types';
import { getToolPackageInfo } from '../core/package-info';

const packageRoot = path.resolve(__dirname, '../../../');
const templatesRoot = path.resolve(packageRoot, 'templates');
const projectTemplateRoot = path.join(templatesRoot);

const eta = new Eta({ views: templatesRoot, autoTrim: false });

const supportedPackageManagers = ['npm', 'pnpm', 'yarn'] as const;
const supportedCiProviders = ['github', 'gitlab', 'none'] as const;
const supportedNpmRegistryTypes = ['public', 'private'] as const;

type PackageManager = (typeof supportedPackageManagers)[number];
type CiProvider = (typeof supportedCiProviders)[number];
type NpmRegistryType = (typeof supportedNpmRegistryTypes)[number];

interface NpmRegistryConfig {
  type: NpmRegistryType;
  url?: string;
  gitlabProjectRegistry?: boolean;
}

interface PackageManagerConfig {
  name: PackageManager;
  setupCommands: string[];
  installCommand: string;
  cache?: 'npm' | 'pnpm' | 'yarn';
  scriptCommand: (script: string) => string;
  directInvoke: string;
}

export interface CreateCommandOptions extends Record<string, unknown> {
  template?: string;
  packageManager?: string;
  skipInstall?: boolean;
  force?: boolean;
  name?: string;
  directory?: string;
  ci?: string;
  npmRegistry?: string;
  npmRegistryUrl?: string;
  gitlabProjectRegistry?: boolean;
}

async function pathExists(target: string) {
  try {
    await fs.access(target);

    return true;
  } catch {
    return false;
  }
}

interface DirectoryCheckResult {
  existed: boolean;
  wasEmpty: boolean;
}

async function ensureTargetDirectory(targetDir: string): Promise<DirectoryCheckResult> {
  const exists = await pathExists(targetDir);

  if (!exists) {
    await fs.mkdir(targetDir, { recursive: true });

    return { existed: false, wasEmpty: true };
  }

  const entries = await fs.readdir(targetDir);
  const isEmpty = entries.length === 0;

  return { existed: true, wasEmpty: isEmpty };
}

interface CreateWizardResult {
  packageName: string;
  directory: string;
  template: string;
  packageManager: PackageManager;
  ci: CiProvider;
  npmRegistry: NpmRegistryConfig;
  installDependencies: boolean;
  repositoryUrl?: string;
  license?: string;
  description?: string;
}

function isInteractiveEnvironment(env: NodeJS.ProcessEnv) {
  if (env['CI'] === 'true' || env['CI'] === '1') {
    return false;
  }

  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function detectPackageManager(env: NodeJS.ProcessEnv): PackageManager {
  const userAgent = env['npm_config_user_agent'] ?? '';

  if (userAgent.startsWith('pnpm/')) {
    return 'pnpm';
  }

  if (userAgent.startsWith('yarn/')) {
    return 'yarn';
  }

  return 'npm';
}

function normalizePackageManager(input: string | undefined, env: NodeJS.ProcessEnv): PackageManager {
  if (!input) {
    return detectPackageManager(env);
  }

  const normalized = input.toLowerCase();

  if (supportedPackageManagers.includes(normalized as PackageManager)) {
    return normalized as PackageManager;
  }

  throw new Error(
    `Unsupported package manager "${input}". Supported managers: ${supportedPackageManagers.join(', ')}.`,
  );
}

function normalizeCiProvider(input: string | undefined): CiProvider {
  if (!input) {
    return 'github';
  }

  const normalized = input.toLowerCase();

  if (supportedCiProviders.includes(normalized as CiProvider)) {
    return normalized as CiProvider;
  }

  throw new Error(`Unsupported CI provider "${input}". Supported providers: ${supportedCiProviders.join(', ')}.`);
}

function normalizeNpmRegistryType(input: string | undefined): NpmRegistryType {
  if (!input) {
    return 'public';
  }

  const normalized = input.toLowerCase();

  if (supportedNpmRegistryTypes.includes(normalized as NpmRegistryType)) {
    return normalized as NpmRegistryType;
  }

  throw new Error(
    `Unsupported npm registry type "${input}". Supported values: ${supportedNpmRegistryTypes.join(', ')}.`,
  );
}

function resolveNpmRegistryConfig(
  ciProvider: CiProvider,
  typeInput: string | undefined,
  urlInput: unknown,
  gitlabProjectRegistryFlag: unknown,
): NpmRegistryConfig {
  const type = normalizeNpmRegistryType(typeInput);
  const rawUrl = typeof urlInput === 'string' && urlInput.trim().length > 0 ? urlInput.trim() : undefined;
  const useGitlabProjectRegistry = gitlabProjectRegistryFlag === true || gitlabProjectRegistryFlag === 'true';

  if (type === 'public') {
    if (useGitlabProjectRegistry) {
      throw new Error('--gitlab-project-registry can only be used with --npm-registry private and --ci gitlab.');
    }

    if (rawUrl) {
      throw new Error('--npm-registry-url is only supported when --npm-registry private.');
    }

    return { type: 'public' };
  }

  if (useGitlabProjectRegistry && ciProvider !== 'gitlab') {
    throw new Error('--gitlab-project-registry is only available when --ci gitlab.');
  }

  if (useGitlabProjectRegistry) {
    return { type: 'private', gitlabProjectRegistry: true };
  }

  if (!rawUrl) {
    throw new Error('Please provide --npm-registry-url when using --npm-registry private.');
  }

  return { type: 'private', url: rawUrl };
}

function sanitizeSegment(segment: string) {
  return (
    segment
      .toLowerCase()
      .replace(/[^a-z\d-]+/g, '-')
      .replace(/^-+/, '')
      // eslint-disable-next-line sonarjs/slow-regex
      .replace(/-+$/, '')
      .replace(/-{2,}/g, '-')
  );
}

function toPackageName(rawName: string) {
  const trimmed = rawName.trim();

  if (!trimmed) {
    return 'boostpack-lib';
  }

  if (trimmed.startsWith('@')) {
    const withoutAt = trimmed.slice(1);
    const [scope, name] = withoutAt.split('/');

    if (!scope || !name) {
      throw new Error('Scoped package names must be in the format @scope/name.');
    }

    return `@${sanitizeSegment(scope)}/${sanitizeSegment(name)}`;
  }

  return sanitizeSegment(trimmed);
}

function validatePackageName(name: string) {
  const pattern = /^(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/;

  if (!pattern.test(name)) {
    throw new Error(`Package name "${name}" is not a valid npm package identifier.`);
  }
}

async function copyTemplate(templateDir: string, targetDir: string) {
  await fs.cp(templateDir, targetDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      // Skip .eta template files
      if (src.endsWith('.eta')) {
        return false;
      }

      // Skip CI directories - they will be handled by applyCiTemplate if needed
      return !(src.includes('/.gitlab') || src.includes('/.github'));
    },
  });
}

async function restoreTemplateArtifacts(targetDir: string) {
  const npmignoreTemplatePath = path.join(targetDir, '.npmignore.template');

  if (await pathExists(npmignoreTemplatePath)) {
    await fs.rename(npmignoreTemplatePath, path.join(targetDir, '.npmignore'));
  }
}

function getPackageManagerConfig(manager: PackageManager): PackageManagerConfig {
  switch (manager) {
    case 'pnpm':
      return {
        name: 'pnpm',
        setupCommands: [
          'corepack enable',
          'corepack prepare pnpm@latest-9 --activate',
          'pnpm config set store-dir .pnpm-store',
        ],
        installCommand: 'pnpm install --frozen-lockfile --prefer-offline --prod=false',
        cache: 'pnpm',
        scriptCommand: (script) => `pnpm run ${script}`,
        directInvoke: 'pnpm dlx create-library',
      };
    case 'yarn':
      return {
        name: 'yarn',
        setupCommands: ['corepack enable', 'corepack prepare yarn@stable --activate'],
        installCommand: 'yarn install --immutable',
        cache: 'yarn',
        scriptCommand: (script) => `yarn ${script}`,
        directInvoke: 'yarn dlx create-library',
      };
    default:
      return {
        name: 'npm',
        setupCommands: [],
        installCommand: 'npm ci',
        cache: 'npm',
        scriptCommand: (script) => `npm run ${script}`,
        directInvoke: 'npx create-library',
      };
  }
}

async function renderTemplateToFile(templateRelativePath: string, targetPath: string, data: Record<string, unknown>) {
  const templateAbsolute = path.join(templatesRoot, templateRelativePath);
  const template = await fs.readFile(templateAbsolute, 'utf8');
  const rendered = eta.renderString(template, data);

  if (!rendered) {
    throw new Error(`Failed to render template ${templateRelativePath}`);
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, rendered, 'utf8');
}

async function finalizePackageJson(options: {
  targetDir: string;
  packageName: string;
  provider: CiProvider;
  packageManager: PackageManager;
  npmRegistry: NpmRegistryConfig;
  repositoryUrl?: string;
  license?: string;
  description?: string;
}) {
  const { targetDir, packageName, provider, repositoryUrl, license, description } = options;
  // Generate repository object if URL is provided
  let repositoryObject: string | undefined;
  if (repositoryUrl) {
    if (repositoryUrl.startsWith('http')) {
      repositoryObject = repositoryUrl;
    } else if (provider === 'github') {
      repositoryObject = `https://github.com/${repositoryUrl}`;
    } else {
      repositoryObject = `https://${repositoryUrl}`;
    }
  }

  const { packageVersion } = await getToolPackageInfo(packageRoot);

  const templateContext = {
    packageName,
    description: description || `A Boostpack TypeScript library`,
    ci: provider,
    libraryScriptsVersion: packageVersion,
    author: undefined,
    repository: repositoryObject,
    license: license || undefined,
    keywords: undefined,
  };

  await renderTemplateToFile('default/package.json.eta', path.join(targetDir, 'package.json'), templateContext);
}

function toDisplayName(raw: string) {
  const sanitized = raw.trim().replace(/^@/, '').replace(/\//g, ' ').replace(/[-_]+/g, ' ');

  return sanitized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseRepositoryUrl(repositoryUrl: string | undefined, ciProvider: CiProvider) {
  if (!repositoryUrl || !repositoryUrl.trim()) {
    return { githubRepo: undefined, gitlabRepo: undefined, gitlabInstance: undefined };
  }

  const cleanUrl = repositoryUrl.trim();

  if (ciProvider === 'github') {
    // Parse GitHub URL: github.com/owner/repo or owner/repo
    const githubPattern = /^(?:https:\/\/github\.com\/)?([^/]+\/[^/]+?)(?:\.git)?$/;
    const githubMatch = githubPattern.exec(cleanUrl);
    if (githubMatch) {
      return { githubRepo: githubMatch[1], gitlabRepo: undefined, gitlabInstance: undefined };
    }
  } else if (ciProvider === 'gitlab') {
    // Parse GitLab URL: gitlab.com/namespace/project or https://custom-gitlab.com/namespace/project
    const gitlabPattern = /^(?:https?:\/\/)?([^/]+)\/(.+?)(?:\.git)?$/;
    const gitlabMatch = gitlabPattern.exec(cleanUrl);
    if (gitlabMatch) {
      const [, instance, project] = gitlabMatch;

      return {
        githubRepo: undefined,
        gitlabRepo: project,
        gitlabInstance: instance === 'gitlab.com' ? 'gitlab.com' : instance,
      };
    }
  }

  return { githubRepo: undefined, gitlabRepo: undefined, gitlabInstance: undefined };
}

async function renderProjectReadme(options: {
  targetDir: string;
  packageName: string;
  packageManager: PackageManager;
  npmRegistry: NpmRegistryConfig;
  ciProvider: CiProvider;
  repositoryUrl?: string;
  license?: string;
  description?: string;
}) {
  const { targetDir, packageName, packageManager, npmRegistry, ciProvider, repositoryUrl, license, description } =
    options;

  const pmConfig = getPackageManagerConfig(packageManager);
  const script = (name: string) => pmConfig.scriptCommand(name);
  const repoInfo = parseRepositoryUrl(repositoryUrl, ciProvider);
  const displayName = toDisplayName(packageName);

  const context = {
    packageName,
    projectName: displayName,
    packageManager,
    pmLabel: packageManager,
    npmRegistry,
    description: description || `A Boostpack TypeScript library`,
    ci: ciProvider,
    githubRepo: repoInfo.githubRepo,
    gitlabRepo: repoInfo.gitlabRepo,
    gitlabInstance: repoInfo.gitlabInstance,
    license: license || 'MIT',
    author: undefined,
    authorUrl: undefined,
    run: {
      build: script('build'),
      testCi: script('test:ci'),
      lintCi: script('lint:ci'),
      format: script('format'),
      formatCheck: script('format:check'),
      release: script('release'),
      install: pmConfig.installCommand,
    },
    cliDirect: pmConfig.directInvoke,
  };

  await renderTemplateToFile('default/README.md.eta', path.join(targetDir, 'README.md'), context);
}

async function applyCiTemplate(options: {
  provider: CiProvider;
  targetDir: string;
  packageManager: PackageManager;
  npmRegistry: NpmRegistryConfig;
  packageName: string;
  logger: CommandContext['logger'];
}) {
  const { provider, targetDir, packageManager, npmRegistry, packageName, logger } = options;
  if (provider === 'none') {
    logger.info('Skipping CI template (none selected).');

    return;
  }

  if (provider === 'github') {
    const githubContext = {
      packageManager,
      npmRegistry,
      packageName,
    };

    await renderTemplateToFile(
      'default/.github/workflows/ci.yml.eta',
      path.join(targetDir, '.github', 'workflows', 'ci.yml'),
      githubContext,
    );

    await renderTemplateToFile(
      'default/.github/workflows/base.yml.eta',
      path.join(targetDir, '.github', 'workflows', 'base.yml'),
      githubContext,
    );

    await renderTemplateToFile(
      'default/.github/workflows/renovate.yml.eta',
      path.join(targetDir, '.github', 'workflows', 'renovate.yml'),
      githubContext,
    );

    logger.info('Added GitHub Actions workflow (.github/workflows/ci.yml, base.yml, renovate.yml).');

    return;
  }

  const gitlabContext = {
    packageManager,
    npmRegistry,
    packageName,
  };

  await renderTemplateToFile('default/.gitlab-ci.yml.eta', path.join(targetDir, '.gitlab-ci.yml'), gitlabContext);
  await renderTemplateToFile(
    'default/.gitlab/base.gitlab-ci.yml.eta',
    path.join(targetDir, '.gitlab', 'base.gitlab-ci.yml'),
    gitlabContext,
  );

  logger.info('Added GitLab CI pipeline (.gitlab-ci.yml and .gitlab/base.gitlab-ci.yml).');
}

async function runInteractiveWizard(
  context: CommandContext<CreateCommandOptions>,
): Promise<CreateWizardResult | undefined> {
  const { cwd, env, options, logger } = context;
  const detectedPackageManager = detectPackageManager(env);

  logger.info('\nWelcome to Boostpack Library creation wizard!\n');

  const packageNameInput = await input({
    message: 'Package name:',
    default: options.name || 'my-boostpack-lib',
    validate: (value: string) => {
      try {
        const name = toPackageName(value);
        validatePackageName(name);

        return true;
      } catch (error) {
        return (error as Error).message;
      }
    },
    transformer: (value: string) => toPackageName(value),
  });

  const packageName = toPackageName(packageNameInput);

  const description = await input({
    message: 'Package description (optional):',
    default: '',
  });

  const directory = await input({
    message: 'Project directory:',
    default: options.directory || packageName.replace(/^@.*\//, ''),
    validate: (value: string) => {
      if (!value.trim()) {
        return 'Directory name is required';
      }

      return true;
    },
  });

  const directoryState = await ensureTargetDirectory(directory);
  if (!directoryState.wasEmpty && !options.force) {
    logger.error('Target directory is not empty. Use --force to overwrite.');

    return;
  }

  const template = await select({
    message: 'Template:',
    choices: [{ name: 'default', value: 'default' }],
    default: options.template || 'default',
  });

  const packageManager: PackageManager = await select({
    message: 'Package manager:',
    choices: supportedPackageManagers.map((pm) => ({
      name: pm === detectedPackageManager ? `${pm} (detected)` : pm,
      value: pm,
    })),
    default: options.packageManager || detectedPackageManager,
  });

  const ci: CiProvider = await select({
    message: 'CI/CD provider:',
    choices: [
      { name: 'GitHub Actions', value: 'github' },
      { name: 'GitLab CI', value: 'gitlab' },
      { name: 'None', value: 'none' },
    ],
    default: options.ci || 'github',
  });

  let repositoryUrl: string | undefined;
  if (ci !== 'none') {
    repositoryUrl = await input({
      message: `Repository URL (${ci === 'github' ? 'github.com/owner/repo' : 'gitlab.com/namespace/project'}):`,
      default: '',
      validate: (value: string): true | string => {
        if (!value.trim()) {
          return true; // Optional field
        }

        if (ci === 'github') {
          // Validate GitHub URL format
          const githubPattern = /^(?:https:\/\/github\.com\/)?([^/]+\/[^/]+?)(?:\.git)?$/;
          if (!githubPattern.test(value.trim())) {
            return 'Please enter a valid GitHub repository (e.g., owner/repo or https://github.com/owner/repo)';
          }
        } else if (ci === 'gitlab') {
          // Validate GitLab URL format (supports custom domains)
          const gitlabPattern = /^(?:https?:\/\/)?([^/]+)\/(.+?)(?:\.git)?$/;
          if (!gitlabPattern.test(value.trim())) {
            return 'Please enter a valid GitLab repository (e.g., gitlab.com/namespace/project or https://your-gitlab.com/namespace/project)';
          }
        }

        return true;
      },
    });
  }

  const npmRegistryType: NpmRegistryType = await select({
    message: 'NPM registry:',
    choices: [
      { name: 'Public (npmjs.com)', value: 'public' },
      { name: 'Private', value: 'private' },
    ],
    default: options.npmRegistry || 'public',
  });

  let gitlabProjectRegistry = false;
  if (ci === 'gitlab' && npmRegistryType === 'private') {
    gitlabProjectRegistry = await confirm({
      message: 'Use GitLab project registry?',
      default: options.gitlabProjectRegistry || false,
    });
  }

  let npmRegistryUrl: string | undefined;
  if (npmRegistryType === 'private' && !gitlabProjectRegistry) {
    npmRegistryUrl = await input({
      message: 'Private registry URL:',
      default: options.npmRegistryUrl || '',
      validate: (value: string) => {
        if (!value.trim()) {
          return 'Registry URL is required for private registries';
        }

        return true;
      },
    });
  }

  const license = await select({
    message: 'License (optional):',
    choices: [
      { name: 'MIT License', value: 'MIT' },
      { name: 'Apache License 2.0', value: 'Apache-2.0' },
      { name: 'GNU GPL v3', value: 'GPL-3.0' },
      { name: 'BSD 3-Clause License', value: 'BSD-3-Clause' },
      { name: 'ISC License', value: 'ISC' },
      { name: 'Mozilla Public License 2.0', value: 'MPL-2.0' },
      { name: 'Unlicense (Public Domain)', value: 'Unlicense' },
      { name: 'Skip (no license)', value: '' },
    ],
    default: 'MIT',
  });

  const installDependencies = await confirm({
    message: 'Install dependencies?',
    default: !options.skipInstall,
  });

  const npmRegistry = resolveNpmRegistryConfig(ci, npmRegistryType, npmRegistryUrl, gitlabProjectRegistry);

  const result: CreateWizardResult = {
    packageName,
    directory: path.resolve(cwd, directory),
    template,
    packageManager,
    ci,
    npmRegistry,
    installDependencies,
  };

  if (repositoryUrl?.trim()) {
    result.repositoryUrl = repositoryUrl.trim();
  }

  if (license) {
    result.license = license;
  }

  if (description?.trim()) {
    result.description = description.trim();
  }

  return result;
}

function validateDirectoryOptions(directoryFromOption: string | undefined, directoryFromArg: string | undefined) {
  if (directoryFromOption && directoryFromArg && directoryFromOption !== directoryFromArg) {
    throw new Error(
      `Conflicting target directories received: "${directoryFromArg}" (positional) vs "${directoryFromOption}" (--directory).`,
    );
  }
}

function hasInteractiveBypassOptions(
  options: CreateCommandOptions,
  directoryFromOption: string | undefined,
  directoryFromArg: string | undefined,
): boolean {
  return Boolean(
    options.name ||
      directoryFromOption ||
      directoryFromArg ||
      options.template ||
      options.packageManager ||
      options.ci ||
      options.npmRegistry ||
      options.npmRegistryUrl ||
      options.gitlabProjectRegistry !== undefined ||
      options.skipInstall !== undefined,
  );
}

function createNonInteractiveResult(
  context: CommandContext<CreateCommandOptions>,
  directoryFromOption: string | undefined,
  directoryFromArg: string | undefined,
): CreateWizardResult | undefined {
  const { cwd, logger, options, env } = context;
  const targetInput = directoryFromOption || directoryFromArg;

  if (typeof targetInput !== 'string' || targetInput.trim() === '') {
    logger.error('Please provide a target directory in non-interactive mode, e.g. create-library my-lib');

    return;
  }

  const targetDir = path.resolve(cwd, targetInput.trim());
  const packageNameInput = options.name || path.basename(targetDir);
  const packageName = toPackageName(packageNameInput);
  validatePackageName(packageName);

  const packageManager = normalizePackageManager(options.packageManager, env);
  const ciProvider = normalizeCiProvider(options.ci);
  const npmRegistry = resolveNpmRegistryConfig(
    ciProvider,
    typeof options.npmRegistry === 'string' ? options.npmRegistry : undefined,
    options.npmRegistryUrl,
    options.gitlabProjectRegistry,
  );

  return {
    packageName,
    directory: targetDir,
    template: options.template || 'default',
    packageManager,
    ci: ciProvider,
    npmRegistry,
    installDependencies: !options.skipInstall,
  };
}

function handleDependencyInstallation(
  installDependencies: boolean,
  packageManager: PackageManager,
  targetDir: string,
  logger: CommandContext['logger'],
) {
  if (!installDependencies) {
    logger.info('Skipping dependency installation.');

    return;
  }

  logger.info(`Installing dependencies with ${packageManager}...`);

  try {
    runCommand(packageManager, ['install'], { cwd: targetDir });
  } catch (error) {
    logger.warn('Automatic dependency installation failed. Please install manually.', error);
  }
}

function showCompletionMessage(
  cwd: string,
  targetDir: string,
  packageManager: PackageManager,
  installDependencies: boolean,
  logger: CommandContext['logger'],
) {
  const runScript = (script: string) => {
    const pmConfig = getPackageManagerConfig(packageManager);

    return pmConfig.scriptCommand(script);
  };

  logger.success('\nProject scaffolded successfully!');

  logger.info('\nNext steps:');
  logger.info(`  • cd ${path.relative(cwd, targetDir) || '.'}`);
  if (!installDependencies) {
    logger.info(`  • ${getPackageManagerConfig(packageManager).installCommand}`);
  }

  logger.info(`  • ${runScript('build')}`);
  logger.info(`  • ${runScript('test:ci')}`);
}

async function scaffoldProject(wizardResult: CreateWizardResult, context: CommandContext<CreateCommandOptions>) {
  const { cwd, logger, options } = context;
  const {
    packageName,
    directory: targetDir,
    template: templateName,
    packageManager,
    ci: ciProvider,
    npmRegistry,
    installDependencies,
    repositoryUrl,
    license,
    description,
  } = wizardResult;

  const templateDir = path.join(projectTemplateRoot, templateName);

  if (!(await pathExists(templateDir))) {
    throw new Error(`Template "${templateName}" was not found.`);
  }

  const directoryState = await ensureTargetDirectory(targetDir);
  if (!directoryState.wasEmpty && !options.force) {
    logger.error('Target directory is not empty. Use --force to overwrite.');

    return;
  }

  logger.info(`\nScaffolding Boostpack library in ${path.relative(cwd, targetDir) || '.'}`);

  await copyTemplate(templateDir, targetDir);
  await restoreTemplateArtifacts(targetDir);

  const params = {
    targetDir,
    packageName,
    provider: ciProvider,
    packageManager,
    npmRegistry,
    ciProvider,
    logger,
    ...(repositoryUrl && { repositoryUrl }),
    ...(license && { license }),
    ...(description && { description }),
  };

  await finalizePackageJson(params);
  await renderProjectReadme(params);
  await applyCiTemplate(params);

  handleDependencyInstallation(installDependencies, packageManager, targetDir, logger);
  showCompletionMessage(cwd, targetDir, packageManager, installDependencies, logger);
}

export async function createBoostpackLibScript(context: CommandContext<CreateCommandOptions>) {
  const { args, options, env } = context;

  const directoryFromOption = typeof options.directory === 'string' ? options.directory.trim() : undefined;
  const directoryFromArg = typeof args[0] === 'string' ? args[0].trim() : undefined;

  validateDirectoryOptions(directoryFromOption, directoryFromArg);

  const hasAnyOption = hasInteractiveBypassOptions(options, directoryFromOption, directoryFromArg);
  const isInteractive = isInteractiveEnvironment(env) && !hasAnyOption;

  const wizardResult = isInteractive
    ? await runInteractiveWizard(context)
    : createNonInteractiveResult(context, directoryFromOption, directoryFromArg);

  if (!wizardResult) {
    return;
  }

  await scaffoldProject(wizardResult, context);
}

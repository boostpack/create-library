import { Eta } from 'eta';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export interface TemplateContext {
  packageManager: PackageManager;
  projectName?: string;
  author?: string;
  description?: string;
  repository?: string;
  [key: string]: unknown;
}

export class TemplateEngine {
  private eta: Eta;
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.resolve(currentDirname, '../../templates');
    this.eta = new Eta({
      views: this.templatesDir,
      autoEscape: false,
      cache: false,
    });
  }

  /**
   * Render a template file with the given context
   */
  async renderTemplate(templatePath: string, context: TemplateContext): Promise<string> {
    const absolutePath = path.isAbsolute(templatePath) ? templatePath : path.join(this.templatesDir, templatePath);

    const template = await fs.readFile(absolutePath, 'utf-8');

    return this.eta.renderString(template, context);
  }

  /**
   * Render and write a template to a file
   */
  async renderToFile(templatePath: string, outputPath: string, context: TemplateContext): Promise<void> {
    const rendered = await this.renderTemplate(templatePath, context);
    await this.ensureDirectory(outputPath);
    await fs.writeFile(outputPath, rendered, 'utf-8');
  }

  /**
   * Copy a file or directory, processing .eta templates
   */
  async processTemplateDirectory(sourceDir: string, targetDir: string, context: TemplateContext): Promise<void> {
    const absoluteSource = path.isAbsolute(sourceDir) ? sourceDir : path.join(this.templatesDir, sourceDir);

    const files = await this.getAllFiles(absoluteSource);

    await Promise.all(
      files.map(async (file) => {
        const relativePath = path.relative(absoluteSource, file);
        let targetPath = path.join(targetDir, relativePath);

        if (file.endsWith('.eta')) {
          // Process eta template
          targetPath = targetPath.replace(/\.eta$/, '');
          await this.renderToFile(file, targetPath, context);
        } else {
          // Copy file as-is
          await this.ensureDirectory(targetPath);
          await fs.copyFile(file, targetPath);
        }
      }),
    );
  }

  /**
   * Detect package manager from the current project
   */
  static async detectPackageManager(cwd: string): Promise<PackageManager> {
    // Check for lock files
    const lockFiles: Record<string, PackageManager> = {
      'package-lock.json': 'npm',
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
    };

    for (const [lockFile, manager] of Object.entries(lockFiles)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await fs.access(path.join(cwd, lockFile));

        return manager;
      } catch {
        // File doesn't exist, continue checking
      }
    }

    // Check package.json for packageManager field
    try {
      const packageJsonPath = path.join(cwd, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as Record<string, unknown>;

      if (typeof packageJson['packageManager'] === 'string') {
        const [manager] = packageJson['packageManager'].split('@');
        if (['npm', 'pnpm', 'yarn'].includes(manager ?? '')) {
          return manager as PackageManager;
        }
      }
    } catch {
      // No package.json or error reading it
    }

    // Default to npm
    return 'npm';
  }

  /**
   * Get commands for different package managers
   */
  static getPackageManagerCommands(pm: PackageManager) {
    const commands = {
      npm: {
        install: 'npm install',
        installDev: 'npm install --save-dev',
        installProd: 'npm install --save',
        installFrozen: 'npm ci',
        run: 'npm run',
        exec: 'npx',
      },
      pnpm: {
        install: 'pnpm install',
        installDev: 'pnpm add -D',
        installProd: 'pnpm add',
        installFrozen: 'pnpm install --frozen-lockfile',
        run: 'pnpm run',
        exec: 'pnpm exec',
      },
      yarn: {
        install: 'yarn install',
        installDev: 'yarn add -D',
        installProd: 'yarn add',
        installFrozen: 'yarn install --frozen-lockfile',
        run: 'yarn',
        exec: 'yarn',
      },
    };

    return commands[pm];
  }

  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return this.getAllFiles(fullPath);
        }

        return fullPath;
      }),
    );

    return files.flat();
  }
}

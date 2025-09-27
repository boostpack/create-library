# @boostpack/create-library

A React Scripts–style toolkit for Boostpack TypeScript libraries. Ship opinionated build, test, lint, and formatting workflows with a single dependency, and opt out at any time with `create-library eject`.

## Why

- 📦 Batteries included Rollup, Jest, ESLint, and Prettier configs.
- 🔁 Flexible CLI (`create-library`) with pass-through args and user hooks.
- 🧩 Extend or override commands from your project config.
- 🛠️ `@boostpack/create-library` scaffolds a ready-to-publish library starter.
- 🧱 GitHub/GitLab CI templates ride along and stay updatable.
- 🧳 `eject` copies all configs for full control when you need it.

## Quick Start

```bash
npm install --save-dev @boostpack/create-library
```

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "create-library build",
    "build:watch": "create-library build --watch",
    "test": "create-library test",
    "lint": "create-library lint",
    "format": "create-library format",
    "format:check": "create-library format --check"
  }
}
```

Run commands via npm/yarn/pnpm or directly:

```bash
npx create-library build -- --environment production
```

> Everything after `--` is forwarded to the underlying tool (Rollup/Jest/ESLint/Prettier).

## CLI Commands

| Command | Description |
|---------|-------------|
| `create-library build [options] -- [rollup args]` | Type-check with TypeScript and bundle with Rollup. `--watch`, `--no-clean`, `--rollup-config`, `--tsconfig`. |
| `create-library test [options] -- [jest args]` | Run Jest tests with watch, coverage, CI reporters, and custom config support. |
| `create-library lint [options] -- [eslint args]` | ESLint with optional `--fix`, `--config`, and `--ci <github|gitlab>`. |
| `create-library format [options] -- [prettier args]` | Format (or `--check`) using Prettier. Default pattern: `src/**/*.{ts,tsx,js,jsx,json,md}`. |
| `create-library eject [options]` | Copy base configs (`rollup`, `jest`, `eslint`, `tsconfig.*`) into your project. Supports `--force`, `--dry-run`, `--skip-install`. |
| `npm init @boostpack/library <directory> [options]`<br>`npx @boostpack/create-library <directory> [options]` | Scaffold a new library project. Options: `--name`, `--template`, `--package-manager`, `--skip-install`, `--force`, `--ci <github|gitlab|none>`. |

### Pass-through arguments

The CLI supports native pass-through. Example:

```bash
create-library lint -- --ext .ts,.tsx src
create-library test -- --runInBand --findRelatedTests src/index.ts
```

## Project Scaffolding

Create a brand-new library with a single command:

```bash
npm init @boostpack/library awesome-lib
# or
npx @boostpack/create-library awesome-lib
```

`@boostpack/create-library` copies the default template (see `templates/default`) and:

- Seeds scripts wired to `create-library` (including `lint:ci` / `test:ci` for the chosen provider).
- Adds `@boostpack/create-library` to `devDependencies` with the current version.
- Drops a base GitHub or GitLab pipeline (or skips CI if `--ci none`).
- Provides config shims (`rollup`, `jest`, `eslint`, `tsconfig*`) that simply re-export packaged presets.
- Re-exports a shared Renovate setup through `renovate.config.js`.
- Renames `_gitignore` → `.gitignore`, refreshes the README, and installs dependencies (unless `--skip-install`).

Use `--package-manager pnpm` or `--force` to scaffold into an existing directory.

Pick a CI surface with `--ci gitlab` or disable CI entirely via `--ci none`.

GitHub projects get a reusable `.github/workflows/ci.base.yml` that the local `ci.yml` extends via `workflow_call`, so updates to this package can flow into consumers with a simple file replace. The GitLab template mirrors this with `ci/base.gitlab-ci.yml` included from `.gitlab-ci.yml`.

When commands run in CI they auto-detect the provider via `GITHUB_ACTIONS` / `GITLAB_CI` environment variables and pick the proper reporters (GitHub Actions annotations or JUnit files for GitLab).

## Base Configuration Resolution

Each command resolves configuration in this order:

1. `--config`/`--tsconfig`/`--rollup-config` flag (absolute or relative).
2. Project-local files (`eslint.config.js`, `jest.config.js`, `rollup.config.mjs`, `tsconfig.json`, `tsconfig.build.json`, `tsconfig.test.json`).
3. Packaged defaults from `@boostpack/create-library/configs/*`.

You can import these configs directly too:

```js
import rollupConfig from '@boostpack/create-library/config/rollup';
export default rollupConfig;
```

```json
{
  "extends": "@boostpack/create-library/config/tsconfig"
}
```

## User Configuration & Hooks

Optionally, create `boostpack.config.{js,cjs,mjs,ts,json}` (or use the `boostpackScripts` field inside `package.json`) to override defaults programmatically.

```js
// boostpack.config.js
/** @type {import('@boostpack/create-library').BoostpackScriptsConfig} */
export default {
  defaults: {
    build: { clean: false },
    lint: { ci: 'github' },
    test: { ci: 'github' }
  },
  hooks: {
    beforeAll(name, ctx) {
      ctx.logger.verbose(`About to run ${name}`);
    },
    onError(name, ctx, error) {
      ctx.logger.error(`Command ${name} failed`, error);
    }
  },
  extend: async (registry) => {
    if (!registry.has('docs')) {
      registry.add({
        name: 'docs',
        description: 'Generate API docs',
        handler: ({ cwd, logger }) => {
          logger.info('Docs coming soon!', cwd);
        }
      });
    }
  }
};
```

Hooks available: `beforeAll`, `afterAll`, `beforeEach`, `afterEach`, `onError`.

Defaults are shallow-merged into CLI options, so CLI flags always win.

## Ejecting

Run `create-library eject` to copy the maintained configs into your repository:

- `eslint.config.js`
- `jest.config.js`
- `rollup.config.mjs`
- `tsconfig.build.json`
- `tsconfig.test.json`

`--dry-run` previews the changes, `--force` overwrites conflicts, and `--skip-install` prevents the follow-up `npm install`.

After ejecting you own the configs—future package updates stop modifying them automatically.

## Developing this Package

```bash
npm install
npx tsc -p tsconfig.build.json --noEmit # type-check
npm test                               # unit tests (if present)
npm run build                          # bundles + copies config/templates
```

The build copies `src/configs` → `dist/configs` and `templates/*` → `dist/templates` for runtime use.

## License

MIT © Boostpack

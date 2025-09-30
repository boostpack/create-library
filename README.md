🚀 Launch production-grade TypeScript libraries in minutes. 

`@boostpack/create-library` hands you a curated toolchain behind a
single CLI you can extend, scaffold with, and eject from the moment you want full control.

## Why

- 📦 Batteries included Rollup, Jest, ESLint, and Prettier configs.
- 🔁 Flexible CLI (`create-library`) with pass-through args.
- 🧩 Extend or override commands from your project config.
- 🛠️ `@boostpack/create-library` scaffolds a ready-to-publish library starter.
- 🧱 GitHub/GitLab CI templates ride along and stay updatable.
- 🧳 `eject` copies all configs for full control when you need it.

## Quick Start

Create a brand-new library with a single command:

```bash
npm init @boostpack/library
# or
npx @boostpack/create-library
```

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

## Ejecting

Run `create-library eject` to copy the maintained configs into your repository:

- `eslint.config.js`
- `jest.config.js`
- `rollup.config.mjs`
- `tsconfig.build.json`
- `tsconfig.test.json`

`--dry-run` previews the changes, `--force` overwrites conflicts, and `--skip-install` prevents the follow-up `npm install`.

After ejecting you own the configs—future package updates stop modifying them automatically.

import path from 'node:path';
import fs from 'node:fs';
import nodeExternals from 'rollup-plugin-node-externals';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

// Shared plugins (put externals first so resolve/commonjs don't bundle them)
const basePlugins = [
  // Automatically marks Node builtins and deps/peerDeps/optDeps as external
  nodeExternals({
    deps: true,
    peerDeps: true,
    optDeps: true,
    devDeps: false,
    builtins: true,
    builtinsPrefix: 'strip', // normalize 'node:fs' → 'fs'
  }),
  // Do not polyfill Node builtins; leave it to the consumer environment
  nodeResolve({ preferBuiltins: true }),
  commonjs(),
];

// Shared TS options; let Rollup write files (important for preserveModules)
const tsCommon = {
  tsconfig: './tsconfig.build.json',
  outputToFilesystem: false,
};

// Build matrix to avoid duplication
const possibleEntries = ['src/index.ts', 'src/cli.ts'];
const entryPoints = possibleEntries
  .map((relativePath) => ({
    relativePath,
    absolutePath: path.resolve(process.cwd(), relativePath),
  }))
  .filter(({ absolutePath }) => fs.existsSync(absolutePath))
  .map(({ relativePath }) => relativePath);

if (entryPoints.length === 0) {
  throw new Error(
    'No entry points found. Expected at least one of: ' + possibleEntries.map((p) => `'${p}'`).join(', '),
  );
}

const targets = [
  // ESM build (per-file) for tree-shaking and deep imports
  {
    format: 'esm',
    dir: 'dist/esm',
    ts: { declaration: true, declarationDir: 'dist/esm', outDir: 'dist/esm' },
    outputExtra: {},
  },
  // CJS build (per-file) for Node/CommonJS consumers
  {
    format: 'cjs',
    dir: 'dist/cjs',
    ts: { declaration: false, declarationMap: false, outDir: 'dist/cjs' },
    outputExtra: { exports: 'named' },
  },
];

// Generate JS bundle config programmatically
const jsBundles = targets.map(({ format, dir, ts, outputExtra }) => ({
  input: entryPoints,
  output: {
    dir,
    format,
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
    ...outputExtra,
  },
  treeshake: { moduleSideEffects: false },
  plugins: [...basePlugins, typescript({ ...tsCommon, ...ts })],
}));

// Single top-level .d.ts that complements per-file declarations
const typesBundle = {
  input: 'dist/esm/index.d.ts',
  output: { file: 'dist/index.d.ts', format: 'esm' },
  plugins: [dts()],
};

export default [...jsBundles, typesBundle];

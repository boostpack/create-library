#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function copyRecursive(source, destination) {
  const stats = fs.statSync(source);

  if (stats.isFile() && source.endsWith('.eta')) {
    return;
  }

  if (stats.isDirectory()) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }

    return;
  }

  fs.copyFileSync(source, destination);
}

const copyJobs = [
  {
    source: path.join(__dirname, '../src/config'),
    destination: path.join(__dirname, '../dist/config'),
    label: 'configs',
  },
  {
    source: path.join(__dirname, '../templates'),
    destination: path.join(__dirname, '../dist/templates'),
    label: 'templates',
  },
];

copyJobs.forEach(({ source, destination, label }) => {
  if (!fs.existsSync(source)) {
    return;
  }

  copyRecursive(source, destination);
  // eslint-disable-next-line no-console
  console.log(`Copied ${label} assets to ${path.relative(process.cwd(), destination)}`);
});

const esmDir = path.join(__dirname, '../dist/esm');
const esmPackageJsonPath = path.join(esmDir, 'package.json');

if (!fs.existsSync(esmDir)) {
  fs.mkdirSync(esmDir, { recursive: true });
}

fs.writeFileSync(esmPackageJsonPath, `${JSON.stringify({ type: 'module' }, null, 2)}\n`, 'utf8');
// eslint-disable-next-line no-console
console.log(`Ensured ${path.relative(process.cwd(), esmPackageJsonPath)} declares type module`);

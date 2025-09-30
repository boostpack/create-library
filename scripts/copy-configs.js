#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function copyRecursive(source, destination) {
  const stats = fs.statSync(source);
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
    label: 'config',
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

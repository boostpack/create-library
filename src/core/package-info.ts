import fs from 'fs/promises';
import path from 'path';

export async function getToolPackageInfo(directory: string) {
  const packageJsonPath = path.join(directory, 'package.json');
  const raw = await fs.readFile(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { name?: unknown; version?: unknown };

  if (typeof parsed.name !== 'string' || typeof parsed.version !== 'string') {
    throw new Error(`Invalid package.json at ${packageJsonPath}: missing name/version.`);
  }

  return {
    packageName: parsed.name,
    packageVersion: parsed.version,
  };
}

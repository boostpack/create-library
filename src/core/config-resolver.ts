import path from 'path';
import fs from 'fs';

interface ResolveConfigPathInput {
  cwd: string;
  customPath?: string;
  projectRelativePath: string;
  packagedRelativePath: string;
  baseDir: string;
}

export function resolveConfigPath({
  cwd,
  customPath,
  projectRelativePath,
  packagedRelativePath,
  baseDir,
}: ResolveConfigPathInput) {
  if (customPath) {
    const absolute = path.isAbsolute(customPath) ? customPath : path.join(cwd, customPath);
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  const projectCandidate = path.join(cwd, projectRelativePath);
  if (fs.existsSync(projectCandidate)) {
    return projectCandidate;
  }

  const visited = new Set<string>();
  let currentBase = baseDir;

  for (let depth = 0; depth < 6; depth += 1) {
    const normalizedBase = path.resolve(currentBase);
    if (visited.has(normalizedBase)) {
      break;
    }

    visited.add(normalizedBase);

    const packagedCandidate = path.resolve(normalizedBase, packagedRelativePath);
    if (fs.existsSync(packagedCandidate)) {
      return packagedCandidate;
    }

    const parentDir = path.dirname(normalizedBase);
    if (parentDir === normalizedBase) {
      break;
    }

    currentBase = parentDir;
  }

  // Fallback to the original resolution (may throw downstream if missing)
  return path.resolve(baseDir, packagedRelativePath);
}

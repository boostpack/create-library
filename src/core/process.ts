import path from 'path';
import fs from 'fs';
import spawn from 'cross-spawn';

export interface RunCommandOptions {
  cwd: string;
  stdio?: 'inherit' | 'pipe';
  env?: NodeJS.ProcessEnv;
  rejectOnError?: boolean;
}

export interface RunCommandResult {
  status: number | null;
  signal: NodeJS.Signals | null;
}

function resolveBin(command: string, cwd: string) {
  const extensions = process.platform === 'win32' ? ['.cmd', '.exe', ''] : ['', '.js'];
  const binDir = path.join(cwd, 'node_modules', '.bin');

  for (const ext of extensions) {
    const candidate = path.join(binDir, `${command}${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return command;
}

export function runCommand(command: string, args: string[], options: RunCommandOptions): RunCommandResult {
  const bin = resolveBin(command, options.cwd);
  const child = spawn.sync(bin, args, {
    cwd: options.cwd,
    stdio: options.stdio ?? 'inherit',
    env: options.env ?? process.env,
  });

  if (options.rejectOnError !== false && child.status !== 0) {
    const formatted = `${command} ${args.join(' ')}`.trim();
    throw new Error(`${formatted} exited with code ${child.status}`);
  }

  return {
    status: child.status,
    signal: child.signal,
  };
}

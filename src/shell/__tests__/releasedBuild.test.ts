// @vitest-environment node
import { describe, expect, it } from 'vitest';

// SC-002, FR-012, D29: a released interface carries no look switch. The build is
// made by the installed Vite CLI in a child process with NODE_ENV removed (as
// `npm run build` runs in a release); Vitest itself runs with NODE_ENV=test, so
// an in-process build would carry the switch and fail on a correct tree.
// This project carries no Node typings, so Node modules arrive by names
// TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const nodePath = 'node:' + 'path';
const nodeOs = 'node:' + 'os';
const nodeCp = 'node:' + 'child_process';
const fs = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (
    path: string,
    options: { withFileTypes: true },
  ) => { name: string; isDirectory: () => boolean }[];
  rmSync: (path: string, options: { recursive: true; force: true }) => void;
};
const path = (await import(/* @vite-ignore */ nodePath)) as {
  join: (...parts: string[]) => string;
};
const os = (await import(/* @vite-ignore */ nodeOs)) as { homedir: () => string };
const cp = (await import(/* @vite-ignore */ nodeCp)) as {
  spawnSync: (
    command: string,
    args: string[],
    options: { env: Record<string, string | undefined>; encoding: 'utf8' },
  ) => { status: number | null; stdout: string; stderr: string };
};
const proc = (globalThis as unknown as {
  process: {
    pid: number;
    execPath: string;
    env: Record<string, string | undefined>;
  };
}).process;

// The switch's own words, read from the switch itself so a renamed switch is
// still the one searched for.
const switchSource = fs.readFileSync('src/look/LookSwitch.tsx', 'utf8');
const label = /<span>([^<]+)<\/span>/.exec(switchSource)?.[1] ?? '';
const choices = [...switchSource.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
const words = [label, ...choices].filter((w) => w !== '');

/** Builds, reads every emitted file, and removes the scratch directory on every exit path. */
function build(mode: 'prod' | 'dev'): string {
  const dir = path.join(
    os.homedir(),
    '.cache',
    'cairn-scratch',
    `sc002-${proc.pid}-${mode}`,
  );
  const env = { ...proc.env };
  delete env.NODE_ENV;
  if (mode === 'dev') env.NODE_ENV = 'development';
  const args = [
    'node_modules/vite/bin/vite.js',
    'build',
    '--outDir',
    dir,
    '--emptyOutDir',
    '--logLevel',
    'silent',
  ];
  if (mode === 'dev') args.push('--mode', 'development');
  try {
    const result = cp.spawnSync(proc.execPath, args, { env, encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`vite build (${mode}) exited ${result.status}: ${result.stderr}`);
    }
    return readAll(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function readAll(dir: string): string {
  let text = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    text += entry.isDirectory() ? readAll(full) : fs.readFileSync(full, 'utf8');
  }
  return text;
}

/** The label as written; each choice only as a quoted literal. */
function found(text: string): string[] {
  return words.filter((word) =>
    word === label
      ? text.includes(word)
      : ['"', "'", '`'].some((q) => text.includes(q + word + q)),
  );
}

describe('the released interface (SC-002)', () => {
  const TIMEOUT = 180_000;

  it('reads the switch label and all four choices from the switch', () => {
    expect(label).toBe('Look (testing)');
    expect(words.length).toBeGreaterThanOrEqual(5);
  });

  it(
    'carries none of the look switch in a production build, and all of it in a development build',
    () => {
      const prod = build('prod');
      const dev = build('dev');
      expect(found(dev).sort(), 'the development build must carry every word').toEqual(
        [...words].sort(),
      );
      expect(found(prod), 'the released build must carry none').toEqual([]);
    },
    TIMEOUT,
  );
});

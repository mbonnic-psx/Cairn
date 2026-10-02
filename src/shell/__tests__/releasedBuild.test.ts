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
  statSync: (path: string) => { isDirectory: () => boolean };
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

// Written as constants (R4b): the Card's class string, and the minified rules theme.css used to ship.
const CARD_CLASSES = 'settle rounded-2xl border border-sand-200';
const CURRENT_CODE = [CARD_CLASSES, '.reflective{', '.settle{', '@keyframes settle'];

describe('the released interface (SC-002)', () => {
  const TIMEOUT = 180_000;

  it('reads the switch label and all three choices from the switch', () => {
    expect(label).toBe('Look (testing)');
    expect(words.length).toBe(4);
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
      expect(prod, 'the released build wears the morning notebook').toContain('Good morning.');
      expect(prod).toContain('nb-root');
      expect(prod).toContain('data-look');
      // The one-column shell's own class strings (research R4), written as constants: it no longer ships.
      for (const current of ['min-h-screen px-6 py-12', 'mx-auto mb-10 flex max-w-3xl']) {
        expect(prod, `the released build must not carry ${current}`).not.toContain(current);
      }
      // The retired layout's own code (R7, E7.1): the Card's class string and the theme's .reflective / .settle rules.
      for (const marker of CURRENT_CODE) {
        expect(prod, `the released build must not carry ${marker}`).not.toContain(marker);
      }
    },
    TIMEOUT,
  );

  it('looks for the retired layout\'s code by markers the retired pins\' captured markup really carries', async () => {
    const { PIN, PROTECTION } = await import('../../screens/__tests__/beforeTheReveal');
    const captured = [...Object.values(PIN), ...Object.values(PROTECTION)].join('\n');
    expect(captured).toContain(CARD_CLASSES);
    expect(captured).toMatch(/class="[^"]*\breflective\b/);
    expect(captured).toMatch(/class="[^"]*\bsettle\b/);
  });
  it(
    'ships no utility only the retired one-column interface used (A1)',
    async () => {
      const { PIN, PROTECTION, TRAIL, LIMITS, TEARDOWN, TODAY, OVER_TIME, TONIGHT } = await import(
        '../../screens/__tests__/beforeTheReveal'
      );
      const captured = [
        ...Object.values(PIN),
        ...Object.values(PROTECTION),
        ...Object.values(TRAIL),
        ...Object.values(LIMITS),
        ...Object.values(TEARDOWN),
        ...Object.values(TODAY),
        ...Object.values(OVER_TIME),
        ...Object.values(TONIGHT),
      ].join('\n');
      const classesIn = (text: string, quoted: boolean): Set<string> => {
        const out = new Set<string>();
        const pattern = quoted ? /["'`]([^"'`\n]*)["'`]/g : /class="([^"]*)"/g;
        for (const m of text.matchAll(pattern)) {
          for (const t of m[1].split(/\s+/)) if (/^[a-z][a-z0-9:_/.\-\[\]]*$/.test(t)) out.add(t);
        }
        return out;
      };
      const retired = classesIn(captured, false);
      // Every word of every file that ships and that Tailwind reads (it skips stylesheets): what the build may really use.
      const shipping = new Set<string>();
      const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === '__tests__') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.(tsx?|html)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
            const text = fs.readFileSync(full, 'utf8');
            for (const t of text.split(/[^A-Za-z0-9:_/.\-\[\]]+/)) shipping.add(t);
          }
        }
      };
      walk('src');
      const only = [...retired].filter((c) => !shipping.has(c));
      expect(only.length, 'the sweep must find classes only the retired interface used').toBeGreaterThan(3);
      const prod = build('prod');
      const escape = (c: string): string => c.replace(/[^A-Za-z0-9_-]/g, (ch) => '\\' + ch);
      const shipped = only.filter((c) => prod.includes('.' + escape(c) + '{') || prod.includes('.' + escape(c) + ','));
      expect(shipped, 'the released CSS must carry none of them').toEqual([]);
      // The five A1 reproduced, named: the one-column shell's own utilities (not all in the pin records).
      for (const named of ['min-h-screen', 'max-w-3xl', 'rounded-2xl', 'bg-sand-50', 'text-sand-50']) {
        expect(prod, `.${named} is only the retired interface's`).not.toContain('.' + named + '{');
      }
    },
    TIMEOUT,
  );
});

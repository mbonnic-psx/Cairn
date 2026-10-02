// @vitest-environment node
import { describe, expect, it } from 'vitest';

// FR-007, D31: the platform's own window frame is kept. Held over the window
// configuration, the capabilities, and every source that could turn the frame
// off at run time. Node modules arrive by names TypeScript cannot see (this
// project carries no Node typings).
const nodeFs = 'node:' + 'fs';
const nodePath = 'node:' + 'path';
const fs = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (
    path: string,
    options: { withFileTypes: true },
  ) => { name: string; isDirectory: () => boolean }[];
};
const path = (await import(/* @vite-ignore */ nodePath)) as {
  join: (...parts: string[]) => string;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'target') continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

interface Window {
  label?: string;
  title?: string;
  decorations?: boolean;
  transparent?: boolean;
  titleBarStyle?: string;
}
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8')) as {
  app: { windows?: Window[] };
};
const windows = config.app.windows ?? [];
const nameOf = (win: Window, index: number) =>
  `window ${index} (${win.label ?? win.title ?? 'unnamed'})`;

const capabilities = walk('src-tauri/capabilities').filter((f) => f.endsWith('.json'));

const isTest = (f: string) => f.includes('__tests__') || /\.test\.tsx?$/.test(f);
const sources = [
  ...walk('src').filter((f) => /\.tsx?$/.test(f) && !isTest(f)),
  ...walk('src-tauri/src').filter((f) => f.endsWith('.rs')),
];

const FORBIDDEN_CALLS = [
  'setDecorations',
  'setTitleBarStyle',
  '.decorations(',
  '.title_bar_style(',
  '.transparent(',
  'set_decorations',
];

describe('the platform keeps its own window frame (FR-007)', () => {
  it('finds at least one window, one capability and one source file', () => {
    expect(windows.length).toBeGreaterThan(0);
    expect(capabilities.length).toBeGreaterThan(0);
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(windows.map((win, index) => [nameOf(win, index), win] as const))(
    '%s keeps decorations, no overlay, no transparency',
    (_name, win) => {
      expect(win.decorations ?? true, 'decorations').toBe(true);
      expect(win.transparent ?? false, 'transparent').toBe(false);
      expect(win.titleBarStyle ?? 'Visible', 'titleBarStyle').toBe('Visible');
    },
  );

  it.each(capabilities.map((f) => [f] as const))(
    '%s grants no run-time frame setter',
    (file) => {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).not.toMatch(/set-decorations|set-title-bar-style/);
    },
  );

  it('no interface or core source turns the frame off at run time', () => {
    const hits: string[] = [];
    for (const file of sources) {
      const text = fs.readFileSync(file, 'utf8');
      for (const call of FORBIDDEN_CALLS) {
        if (text.includes(call)) hits.push(`${file}: ${call}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

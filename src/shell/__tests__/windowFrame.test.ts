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

// Tauri merges, over tauri.conf.json, a file per platform (tauri.{macos,windows,
// linux}.conf.json, the .json5 forms, Tauri.{platform}.toml). Every one present
// under src-tauri/ is read, so a new one is held rather than missed.
const CONFIG_NAME =
  /^tauri(\.(macos|windows|linux|android|ios))?\.(conf\.json5?|toml)$/i;
const configFiles = fs
  .readdirSync('src-tauri', { withFileTypes: true })
  .filter((e) => !e.isDirectory() && CONFIG_NAME.test(e.name))
  .map((e) => path.join('src-tauri', e.name));

/** Windows of a config file; JSON is parsed, other forms are read as text. */
function windowsOf(file: string): Window[] | null {
  if (!file.endsWith('.json')) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    app?: { windows?: Window[] };
  };
  return parsed.app?.windows ?? [];
}
const windows = configFiles.flatMap((file) =>
  (windowsOf(file) ?? []).map((win, index) => ({ file, win, index })),
);
const nameOf = (file: string, win: Window, index: number) =>
  `${file} window ${index} (${win.label ?? win.title ?? 'unnamed'})`;

const capabilities = walk('src-tauri/capabilities');

const isTest = (f: string) => f.includes('__tests__') || /\.test\.tsx?$/.test(f);
const sources = [
  ...walk('src').filter((f) => /\.tsx?$/.test(f) && !isTest(f)),
  ...walk('src-tauri/src').filter((f) => f.endsWith('.rs')),
];

// Every Tauri frame setter and builder, by pattern: Rust `.decorations(`,
// `.set_title_bar_style(`, `.transparent(` ...; TS/JS `setDecorations`,
// `setTitleBarStyle`.
const RUST_FRAME = /\.(set_)?(decorations|title_bar_style|transparent)\s*\(/;
const TS_FRAME = /\bset(Decorations|TitleBarStyle)\b/;
// The interface creates no window of its own: a window made at run time carries
// its own frame options, so creation is refused outright.
const TS_WINDOW = /\bnew\s+(Webview)?Window\s*\(/;
// Config forms the test cannot parse are read as text.
const TEXT_FRAME_OFF = [
  /decorations["']?\s*[:=]\s*false/i,
  /transparent["']?\s*[:=]\s*true/i,
  /title_?bar_?style["']?\s*[:=]\s*["']?(?!visible\b)\w/i,
];

describe('the platform keeps its own window frame (FR-007)', () => {
  it('finds the base config, at least one window, one capability and one source file', () => {
    expect(configFiles).toContain(path.join('src-tauri', 'tauri.conf.json'));
    expect(windows.length).toBeGreaterThan(0);
    expect(capabilities.length).toBeGreaterThan(0);
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(configFiles.map((f) => [f] as const))(
    '%s turns the frame off nowhere in text',
    (file) => {
      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of TEXT_FRAME_OFF) {
        expect(text, `${file}: ${pattern}`).not.toMatch(pattern);
      }
    },
  );

  it.each(windows.map((w) => [nameOf(w.file, w.win, w.index), w.win] as const))(
    '%s keeps decorations, no overlay, no transparency',
    (_name, win) => {
      expect(win.decorations ?? true, 'decorations').toBe(true);
      expect(win.transparent ?? false, 'transparent').toBe(false);
      expect(String(win.titleBarStyle ?? 'Visible').toLowerCase(), 'titleBarStyle').toBe(
        'visible',
      );
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
      const rust = file.endsWith('.rs');
      for (const pattern of rust ? [RUST_FRAME] : [TS_FRAME, TS_WINDOW]) {
        const match = pattern.exec(text);
        if (match) hits.push(`${file}: ${match[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

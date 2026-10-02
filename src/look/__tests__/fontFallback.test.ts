import { describe, expect, it } from 'vitest';

// Vitest blanks CSS imports, and this project carries no Node typings, so the
// stylesheets are read from disk through a module name TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const theme = readFileSync('src/styles/theme.css', 'utf8');
const SHEETS = ['notebook', 'protection-page', 'quiet-pages', 'setup-pages', 'tonight-page'].map((name) => ({
  name,
  css: readFileSync(`src/styles/${name}.css`, 'utf8'),
}));

function stack(property: string): string[] {
  const found = new RegExp(`${property}:\\s*([^;]+);`).exec(theme);
  if (!found) throw new Error(`theme.css sets no ${property}`);
  return found[1]!.split(',').map((face) => face.trim().replace(/^'|'$/g, ''));
}

// Spec edge case "Fonts missing": if a bundled font cannot be used, a close system fallback is shown, and every rule
// about which text is serif and which is typewriter-style still holds.
describe('a bundled font that cannot be used falls back to a face of the same kind', () => {
  it('the serif stack names the bundled serif first, then system serifs, and ends in serif', () => {
    const serif = stack('--font-notebook-serif');
    expect(serif[0]).toBe('Libre Caslon Text');
    expect(serif.length).toBeGreaterThan(2);
    expect(serif.at(-1)).toBe('serif');
  });

  it('the typewriter stack names the bundled mono first, then system monos, and ends in monospace', () => {
    const mono = stack('--font-notebook-mono');
    expect(mono[0]).toBe('IBM Plex Mono');
    expect(mono.length).toBeGreaterThan(2);
    expect(mono.at(-1)).toBe('monospace');
  });

  it.each(SHEETS)('$name.css names no face of its own, only the two stacks, so the fallback reaches every rule', ({ css }) => {
    const families = Array.from(css.matchAll(/font-family:\s*([^;]+);/g), (m) => m[1]!.trim());
    for (const family of families) expect(family).toMatch(/^var\(--nb-font-(serif|mono)\)$|^inherit$/);
  });
});

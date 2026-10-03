/// <reference types="vite/client" />
/**
 * Nothing a look re-points fades (loose-ends T007; looks T024, D3): no element on any screen a page
 * can show carries a transition, animation or settle class, in any look and any state the case files hold,
 * and Protection's "Keep things as they are" is a plain button with the box the shared one had.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Disclosure } from '../../screens/Disclosure';
import { CheckIn } from '../../screens/CheckIn';
import { Limits } from '../../screens/Limits';
import { Protection } from '../../screens/Protection';
import { Reaches } from '../../screens/Reaches';
import { Choosing } from '../../screens/Setup/Choosing';
import { Teardown } from '../../screens/Teardown';
import { Trail } from '../../screens/Trail';
import { installFakeCore, never, type FakeCore } from '../../screens/__tests__/fakeCore';
import { cases as protectionCases, trailCases } from '../../screens/__tests__/pinCases';
import { disclosureCases, teardownCases } from '../../screens/__tests__/quietCases';
import { categories, disclosures, waitingNote } from '../../screens/__tests__/setupCases';
import {
  evening,
  overTimeCases,
  overTimeReader,
  todayCases,
  tonightCases,
  tonightCore,
} from '../../screens/__tests__/tonightCases';
import { NotebookShell } from '../../shell/NotebookShell';
import type { Look } from '../look';

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const protectionSheet = noComments(readFileSync('src/styles/protection-page.css', 'utf8'));
const ruleBody = (selector: string) =>
  [...protectionSheet.matchAll(/([^{};]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1]!.trim() === selector)
    .map((m) => m[2]!)
    .join('');

const SHEET_DIR = 'src/styles';
const { readdirSync } = (await import(/* @vite-ignore */ nodeFs)) as { readdirSync: (path: string) => string[] };

interface Motion {
  sheet: string;
  /** The selector, or `@keyframes name` for a keyframes block. */
  selector: string;
  property: string;
  value: string;
  /** The at-rules the declaration sits inside, outermost first. */
  context: string[];
}

/** Every transition/animation declaration and every @keyframes block in a sheet, by walking its braces. */
function motionIn(sheet: string, css: string): Motion[] {
  const found: Motion[] = [];
  const stack: { head: string; start: number }[] = [];
  let from = 0;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '{') {
      stack.push({ head: css.slice(from, i).trim(), start: i + 1 });
      from = i + 1;
    } else if (ch === '}') {
      const block = stack.pop()!;
      const heads = [...stack.map((b) => b.head), block.head];
      const inner = css.slice(block.start, i);
      if (block.head.startsWith('@keyframes')) {
        found.push({ sheet, selector: block.head, property: '@keyframes', value: '', context: stack.map((b) => b.head) });
      } else if (!inner.includes('{') && !block.head.startsWith('@')) {
        for (const d of inner.split(';')) {
          const m = /^\s*(transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?)\s*:\s*([\s\S]*?)\s*$/.exec(d);
          if (m) {
            found.push({
              sheet,
              selector: block.head.replace(/\s+/g, ' '),
              property: m[1]!,
              value: m[2]!.replace(/\s*!important$/, ''),
              context: heads.slice(0, -1),
            });
          }
        }
      }
      from = i + 1;
    } else if (ch === ';' && stack.length === 0) {
      from = i + 1;
    }
  }
  return found;
}

/**
 * The only motion the sheets may declare. D3 is about a change of look re-lighting colours, so a transition
 * is allowed only where it names no property a look token feeds. The shell tabs' hover filter is the one
 * such (no look sets `filter`), allowed by its exact sheet, selector, property and value.
 */
const ALLOWED_MOTION = [
  { sheet: 'notebook.css', selector: '.nb-tab', property: 'transition', value: 'filter 160ms ease' },
];

/** Whether a declaration sits in exactly the `@media (prefers-reduced-motion: reduce)` block (whitespace-normalised), where motion is switched off. */
const inReducedMotion = (m: Motion) => m.context.some((c) => c.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')') === '@media (prefers-reduced-motion: reduce)');

function unallowedMotion(sheets: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [sheet, css] of Object.entries(sheets)) {
    for (const m of motionIn(sheet, noComments(css))) {
      if (inReducedMotion(m)) continue;
      const allowed = ALLOWED_MOTION.some(
        (a) => a.sheet === m.sheet && a.selector === m.selector && a.property === m.property && a.value === m.value,
      );
      if (!allowed) out.push(`${m.sheet}: ${m.selector} { ${m.property}: ${m.value} }`);
    }
  }
  return out;
}

const LOOKS: Look[] = ['morning', 'midday', 'night'];
const noop = () => undefined;
const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];
const settle = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 20)));

/** A class that fades or settles: `transition`, `transition-*`, `duration-*`, `animate-*`, `settle`. */
const FADING = /^(transition(-.*)?|duration-.*|animate-.*|settle)$/;

let core: FakeCore | undefined;
afterEach(() => {
  cleanup();
  core?.remove();
  core = undefined;
});

function onPage(ui: React.ReactElement, look: Look) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

type Scene = (look: Look) => Promise<HTMLElement>;
const scenes: Record<string, Scene> = {};
const add = (name: string, scene: Scene) => {
  scenes[name] = scene;
};

add('Choosing, with a note', async (look) =>
  onPage(<Choosing categories={categories} onToggle={noop} note={waitingNote} onTurnOn={noop} />, look),
);
add('Disclosure, with details', async (look) =>
  onPage(<Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />, look),
);
add('Disclosure, loading', async (look) => {
  core = installFakeCore({ get_disclosures: never });
  const main = onPage(<Disclosure onConfirm={noop} onBack={noop} />, look);
  await settle();
  return main;
});
add('Disclosure, unreadable', async (look) => {
  core = installFakeCore({
    get_disclosures: () => {
      throw 'unreadable';
    },
  });
  const main = onPage(<Disclosure onConfirm={noop} onBack={noop} />, look);
  await settle();
  return main;
});
for (const [name, c] of Object.entries(protectionCases)) {
  add(`Protection, ${name}`, async (look) => onPage(<Protection state={c.state} pending={c.pending} />, look));
}
for (const [name, c] of Object.entries(trailCases)) {
  add(`Trail, ${name}`, async (look) => onPage(<Trail {...c} />, look));
}
for (const [name, today] of Object.entries(todayCases)) {
  add(`Reaches, Today, ${name}`, async (look) =>
    onPage(<Reaches today={today} read={overTimeReader('looking')} now={evening} />, look),
  );
}
for (const [name, answer] of Object.entries(overTimeCases)) {
  add(`Reaches, Over time, ${name}`, async (look) => {
    const main = onPage(<Reaches today={todayCases.sealed} read={overTimeReader(answer)} now={evening} />, look);
    await userEvent.click(screen.getByRole('button', { name: 'Over time' }));
    await settle();
    return main;
  });
}
for (const [name, c] of Object.entries(tonightCases)) {
  add(`CheckIn, ${name}`, async (look) => {
    core = installFakeCore(tonightCore(c));
    const main = onPage(<CheckIn />, look);
    await settle();
    return main;
  });
}
for (const [name, c] of Object.entries(disclosureCases)) {
  add(`Limits, ${name}`, async (look) => onPage(<Limits disclosures={c} />, look));
}
for (const [name, c] of Object.entries(teardownCases)) {
  add(`Teardown, ${name}`, async (look) => onPage(<Teardown report={c} />, look));
}

describe('no sheet the app loads declares a fade', () => {
  const sheets = Object.fromEntries(
    readdirSync(SHEET_DIR)
      .filter((f) => f.endsWith('.css'))
      .map((f) => [f, readFileSync(`${SHEET_DIR}/${f}`, 'utf8')]),
  );

  it('reads every sheet main.tsx imports', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const imported = [...main.matchAll(/import\s+'\.\/styles\/([^']+\.css)'/g)].map((m) => m[1]!).sort();
    expect(Object.keys(sheets).sort()).toEqual(imported);
  });

  it('declares no transition, animation or keyframes beyond the named allowances', () => {
    expect(unallowedMotion(sheets)).toEqual([]);
  });

  it('names a transition on a colour a look re-points, by sheet and selector', () => {
    const planted = { ...sheets, 'protection-page.css': `${sheets['protection-page.css']}\n.nb-protection-note__button { transition: color 200ms ease; }` };
    expect(unallowedMotion(planted)).toEqual([
      'protection-page.css: .nb-protection-note__button { transition: color 200ms ease }',
    ]);
  });

  it('names a transition or animation inside a media block that is not the reduced-motion one', () => {
    const planted = { ...sheets, 'quiet-pages.css': `${sheets['quiet-pages.css']}\n@media (min-width: 900px) { .a, .b { animation-name: x; } }` };
    expect(unallowedMotion(planted)).toEqual(['quiet-pages.css: .a, .b { animation-name: x }']);
  });

  // T017: only exactly `@media (prefers-reduced-motion: reduce)` is exempt. Synthetic sheets; none is written under src/styles/.
  it('names a fade inside the negated reduced-motion block, which is for the people who did not ask for less motion', () => {
    const planted = {
      ...sheets,
      'protection-page.css': `${sheets['protection-page.css']}\n@media not (prefers-reduced-motion: reduce) { .nb-protection-note__button { transition: color 200ms ease; } }`,
    };
    expect(unallowedMotion(planted)).toEqual([
      'protection-page.css: .nb-protection-note__button { transition: color 200ms ease }',
    ]);
  });

  it('names a fade in a media query that only mentions the reduced-motion one, and exempts the exact one whatever its spacing', () => {
    const fade = '.a { transition: color 200ms ease; }';
    expect(unallowedMotion({ 'x.css': `@media (prefers-reduced-motion: no-preference) { ${fade} }` })).toHaveLength(1);
    expect(unallowedMotion({ 'x.css': `@media screen and (prefers-reduced-motion: reduce) { ${fade} }` })).toHaveLength(1);
    expect(unallowedMotion({ 'x.css': `@media (prefers-reduced-motion: reduce) { ${fade} }` })).toEqual([]);
    expect(unallowedMotion({ 'x.css': `@media   (prefers-reduced-motion:   reduce) { ${fade} }` })).toEqual([]);
  });

  it('holds no inline transition or animation on a rendered element', async () => {
    for (const name of Object.keys(scenes)) {
      const main = await scenes[name]!('morning');
      for (const el of Array.from(main.querySelectorAll<HTMLElement>('[style]'))) {
        const style = el.getAttribute('style') ?? '';
        expect(style, `${name}: <${el.tagName.toLowerCase()}> style`).not.toMatch(/transition|animation/);
      }
      cleanup();
      core?.remove();
      core = undefined;
    }
    // Renders every scene in one test: about 1 s alone, but past vitest's 5 s default
    // under a full parallel run, which then left the file's later scenes empty.
  }, 30_000);
});

describe('nothing a page can show fades', () => {
  it('sweeps every screen with a page branch', () => {
    const screens = new Set(Object.keys(scenes).map((n) => n.split(',')[0]));
    expect([...screens].sort()).toEqual(
      ['CheckIn', 'Choosing', 'Disclosure', 'Limits', 'Protection', 'Reaches', 'Teardown', 'Trail'].sort(),
    );
  });

  describe.each(LOOKS)('in the %s look', (look) => {
    it.each(Object.keys(scenes))('%s: no element carries a transition, animation or settle class', async (name) => {
      const main = await scenes[name]!(look);
      const all = Array.from(main.querySelectorAll('*'));
      expect(all.length).toBeGreaterThan(0);
      for (const el of all) {
        const fading = Array.from(el.classList).filter((c) => FADING.test(c));
        expect(fading, `${name}, ${look}: <${el.tagName.toLowerCase()} class="${el.getAttribute('class')}"> carries ${fading.join(' ')}`).toEqual([]);
      }
    });
  });
});

describe('Protection\'s "Keep things as they are" on the page', () => {
  it.each(LOOKS)('is a plain button in the %s look', (look) => {
    const main = onPage(<Protection {...protectionCases['in force, a change waiting']!} />, look);
    const button = screen.getByRole('button', { name: 'Keep things as they are' });
    expect(main.contains(button)).toBe(true);
    expect(button.outerHTML).toBe(
      '<button type="button" class="nb-protection-note__button">Keep things as they are</button>',
    );
  });

  it('keeps the box the shared button gave it, from the sheet', () => {
    const body = ruleBody('.nb-protection-note__button');
    // board-scale (D39): the box grows with the notebook, 10 by 20 at today's size.
    expect(body).toMatch(/padding:\s*calc\(10 \* var\(--nb-u\)\) calc\(20 \* var\(--nb-u\)\)/);
    expect(body).toMatch(/border-radius:\s*calc\(8 \* var\(--nb-u\)\)/);
    expect(body).toMatch(/font-weight:\s*500/);
    expect(body).toMatch(/line-height:\s*calc\(1\.25 \/ 0\.875\)/);
  });
});


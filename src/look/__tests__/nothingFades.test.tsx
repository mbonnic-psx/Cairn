/// <reference types="vite/client" />
/**
 * Nothing a look re-points fades (loose-ends T007; looks T024, D3, SC-009): no element on any screen a page
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
import type { NotebookLook } from '../look';

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

const LOOKS: NotebookLook[] = ['morning', 'midday', 'night'];
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

function onPage(ui: React.ReactElement, look: NotebookLook) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

type Scene = (look: NotebookLook) => Promise<HTMLElement>;
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
    expect(body).toMatch(/padding:\s*10px 20px/);
    expect(body).toMatch(/border-radius:\s*8px/);
    expect(body).toMatch(/font-weight:\s*500/);
    expect(body).toMatch(/line-height:\s*calc\(1\.25 \/ 0\.875\)/);
  });
});


/// <reference types="vite/client" />
/**
 * Every control the Today and Tonight spreads draw, rendered on a notebook page in every look (slice
 * `tonight-page`, T016–T017): each is reached by the keyboard and shows an outline of its own from the ink, and
 * nothing on the spreads fades. The core is a fake written in the test tree at the one seam the screens call it
 * through, and the Today reader is a plain object.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { CheckIn } from '../../screens/CheckIn';
import { Reaches } from '../../screens/Reaches';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import {
  overTimeCases,
  overTimeReader,
  silentReader,
  todayCases,
  tonightCases,
  tonightCore,
} from '../../screens/__tests__/tonightCases';
import { NotebookShell } from '../../shell/NotebookShell';
import { contrastRatio } from '../contrast';
import type { NotebookLook } from '../look';

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const sheet = noComments(readFileSync('src/styles/tonight-page.css', 'utf8'));
const notebook = noComments(readFileSync('src/styles/notebook.css', 'utf8'));
const rules = [...sheet.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));

const LOOKS: NotebookLook[] = ['morning', 'midday', 'night'];
const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];
const noop = () => undefined;

let core: FakeCore | undefined;
afterEach(() => {
  cleanup();
  core?.remove();
  core = undefined;
});

/** The controls the spreads draw, by the class that carries each one's outline, and what each is. */
const CONTROLS: Record<string, string> = {
  'nb-reaches-which__button': 'the Which days buttons, Today and Over time',
  'nb-reaches-date': 'the From and To boxes',
  'nb-checkin-write': 'the writing space',
  'nb-checkin-keep': 'Keep this',
  'nb-checkin-switch': 'the quotes switch',
};

const FOCUSABLE = 'input, button, select, textarea, a[href], [tabindex]';
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 30)));

function onPage(ui: React.ReactElement, look: NotebookLook) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return { ...view, main: view.container.querySelector('main') as HTMLElement };
}

async function tonight(name: string, look: NotebookLook): Promise<HTMLElement> {
  const c = tonightCases[name]!;
  core = installFakeCore(tonightCore(c));
  const { main } = onPage(<CheckIn />, look);
  await settle();
  const write = main.querySelector('textarea');
  if (write) fireEvent.change(write, { target: { value: c.keep?.typed ?? 'A few words.' } });
  if (c.keep) {
    fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
    await settle();
    if (write) fireEvent.change(write, { target: { value: 'More words.' } });
  }
  if (c.switchRefused) {
    fireEvent.click(screen.getByRole('button', { name: 'Hide quotes' }));
    await settle();
  }
  return main;
}

/** Every state of both spreads, as a function that renders it in a look and returns the page area. */
const scenes: Record<string, (look: NotebookLook) => Promise<HTMLElement>> = {};
for (const name of Object.keys(todayCases)) {
  scenes[`Today, Today view: ${name}`] = async (look) => {
    const { main } = onPage(<Reaches today={todayCases[name]} read={silentReader} />, look);
    await settle();
    return main;
  };
}
for (const name of Object.keys(overTimeCases)) {
  scenes[`Today, Over time: ${name}`] = async (look) => {
    const { main } = onPage(<Reaches today={todayCases['a log, the fallback note']} read={overTimeReader(overTimeCases[name]!)} />, look);
    await userEvent.click(screen.getByRole('button', { name: 'Over time' }));
    await settle();
    return main;
  };
}
for (const name of Object.keys(tonightCases)) {
  scenes[`Tonight: ${name}`] = (look) => tonight(name, look);
}

const lookBlock = (look: string) => notebook.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
const token = (name: string, look: string) => lookBlock(look).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))![1]!;

const focusRule = (name: string) =>
  rules.filter((r) => r.selector.split(',').map((x) => x.trim()).includes(`.${name}:focus-visible`)).map((r) => r.body).join('');

/** Tab from the top of the document through every stop, and say which elements were reached. */
async function reachedByTab(root: HTMLElement): Promise<Set<Element>> {
  const reached = new Set<Element>();
  const total = document.querySelectorAll(FOCUSABLE).length;
  (document.activeElement as HTMLElement | null)?.blur();
  for (let i = 0; i < total + 2; i += 1) {
    await userEvent.tab();
    if (root.contains(document.activeElement)) reached.add(document.activeElement!);
  }
  return reached;
}

describe.each(LOOKS)('focus on the paper, in the %s look (T016)', (look) => {
  it('holds --nb-ink at 3:1 on the paper, the colour every outline here is drawn in', () => {
    expect(contrastRatio(token('--nb-ink', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.keys(scenes))('%s: every control is reached by Tab and carries an outline of its own', async (name) => {
    const main = await scenes[name]!(look);
    const controls = Array.from(main.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !(el as HTMLButtonElement).disabled,
    );
    const reached = await reachedByTab(main);
    for (const control of controls) {
      expect(reached.has(control), `${control.outerHTML.slice(0, 80)} is not reached by Tab`).toBe(true);
      const own = Object.keys(CONTROLS).filter((c) => control.classList.contains(c));
      expect(own, `${control.outerHTML.slice(0, 80)} carries no control class the sweep knows`).toHaveLength(1);
      const rule = focusRule(own[0]!);
      expect(rule, `no :focus-visible rule for .${own[0]}`).toMatch(/outline:\s*2px solid var\(--nb-ink\)/);
      expect(rule, own[0]).toMatch(/outline-offset:\s*2px/);
      expect(control.className).not.toMatch(/focus:border-clay-500|focus:outline-none/);
    }
  });

  it('names every control the spreads draw, so a new one with no rule fails', async () => {
    const found = new Set<string>();
    for (const name of Object.keys(scenes)) {
      const main = await scenes[name]!(look);
      for (const el of Array.from(main.querySelectorAll<HTMLElement>(FOCUSABLE))) {
        for (const c of el.classList) if (c.startsWith('nb-')) found.add(c);
        expect(el.className, `${el.outerHTML.slice(0, 60)} has no class`).toMatch(/\bnb-/);
        expect(el.className).not.toMatch(/focus:border-clay-500|focus:outline-none/);
      }
      cleanup();
      core?.remove();
      core = undefined;
    }
    expect([...found].sort()).toEqual(Object.keys(CONTROLS).sort());
  });
});

/**
 * The setup screens keep every word, control and state they had before the notebook became the only layout (slice
 * `reveal`, Increment 1c, D43, FR-018): What would you like to protect?, Anywhere else?, Before Cairn changes
 * anything, and the choosing step as `Choosing` composes them. Each pin state is brought about the way the pin
 * brought it about, but inside `NotebookShell`, in each look; its words, controls and states must equal the
 * baseline's (`beforeTheReveal.ts`). The core is a fake written in this tree.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotebookShell } from '../../shell/NotebookShell';
import { Disclosure } from '../Disclosure';
import { Categories } from '../Setup/Categories';
import { Choosing } from '../Setup/Choosing';
import { CustomEntry } from '../Setup/CustomEntry';
import { baseline, controlsOf, structureOf, wordsOf, PIN } from './beforeTheReveal';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import { categories, disclosures, localhostReason, readBack, waitingNote } from './setupCases';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

const noop = () => undefined;
type Look = 'morning' | 'midday' | 'night';
type Check = Parameters<typeof CustomEntry>[0]['check'];

/** Render a screen on the notebook page, in a look, and hand back the page area. */
function show(ui: React.ReactElement, look: Look) {
  const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

async function addAnd(look: Look, check: Check) {
  const main = show(<CustomEntry add={async () => ['example.com', 'www.example.com']} check={check} />, look);
  await userEvent.type(screen.getByLabelText('Address to protect'), 'Example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
  await screen.findByText(/example\.com, www\.example\.com/);
  return main;
}

async function refusedWith(look: Look, problem: unknown) {
  const main = show(
    <CustomEntry
      add={async () => {
        throw problem;
      }}
    />,
    look,
  );
  await userEvent.type(screen.getByLabelText('Address to protect'), 'localhost');
  await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
  await screen.findByRole('status');
  return main;
}

/** Every pinned state, by the pin's own name, brought about on the notebook page. */
const states: Record<string, (look: Look) => Promise<HTMLElement>> = {
  'categories, none': async (look) => show(<Categories categories={[]} onToggle={noop} />, look),
  'categories, some on, some edited': async (look) => show(<Categories categories={categories} onToggle={noop} />, look),
  'categories, with a note': async (look) =>
    show(<Categories categories={categories} onToggle={noop} note={waitingNote} />, look),
  'address, nothing typed': async (look) => show(<CustomEntry add={async () => []} />, look),
  'address, typed': async (look) => {
    const main = show(<CustomEntry add={async () => []} />, look);
    await userEvent.type(screen.getByLabelText('Address to protect'), 'example.com');
    return main;
  },
  'address added, read back in force': (look) => addAnd(look, async () => readBack('in_force')),
  'address added, read back off': (look) => addAnd(look, async () => readBack('off')),
  'address added, read back not confirmed': (look) => addAnd(look, async () => readBack('not_verified')),
  'address added, read back could not be made': (look) =>
    addAnd(look, async () => {
      throw 'no read-back';
    }),
  'address refused, with a reason': (look) =>
    refusedWith(look, { reason: localhostReason, kind: 'keeps_the_machine_working' }),
  'address refused, with a sentence': (look) => refusedWith(look, 'Cairn could not reach its settings just now.'),
  'address refused, with nothing readable': (look) => refusedWith(look, 42),
  'disclosure, with details': async (look) =>
    show(<Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />, look),
  'disclosure, details loading': async (look) => {
    core = installFakeCore({ get_disclosures: never });
    return show(<Disclosure onConfirm={noop} onBack={noop} />, look);
  },
  'disclosure, details could not be read': async (look) => {
    core = installFakeCore({
      get_disclosures: () => {
        throw 'unreadable';
      },
    });
    const main = show(<Disclosure onConfirm={noop} onBack={noop} />, look);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return main;
  },
  'disclosure, details fetched': async (look) => {
    core = installFakeCore({ get_disclosures: () => disclosures });
    const main = show(<Disclosure onConfirm={noop} onBack={noop} />, look);
    await screen.findByText(disclosures.administrator);
    return main;
  },
  // The pin's last state is the column `App` drew before the reveal: the choosing step with the core's categories.
  'the choosing step through App, in Current': async (look) =>
    show(<Choosing categories={categories} onToggle={noop} onTurnOn={vi.fn()} />, look),
};

describe('the states the baseline holds', () => {
  it('are the pin\'s own: 3 of the categories, 9 of the address, 4 of the disclosure, and the choosing step', () => {
    expect(Object.keys(states).sort()).toEqual(Object.keys(PIN).sort());
    expect(Object.keys(PIN).filter((n) => n.startsWith('categories'))).toHaveLength(3);
    expect(Object.keys(PIN).filter((n) => n.startsWith('address'))).toHaveLength(9);
    expect(Object.keys(PIN).filter((n) => n.startsWith('disclosure'))).toHaveLength(4);
  });
});

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (look) => {
  it.each(Object.keys(PIN))('%s keeps its words and controls', async (name) => {
    const main = await states[name]!(look);
    const was = baseline(PIN[name]!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
    expect(structureOf(main)).toEqual(structureOf(was));
  });
});

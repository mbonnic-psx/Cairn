/**
 * The pin (slice 004 `setup-pages`, T001): today's markup of What would you like to protect?, Anywhere else?,
 * Before Cairn changes anything, and the choosing step as `App` composes it in Current, every state, outside any
 * notebook page.
 *
 * Captured from the code as it stood before the slice changed any of them, and seen passing there. Outside a
 * notebook page they must render exactly this, element for element (SC-009), so Current and every existing screen
 * test are unchanged. A change here is a change to today's interface: it needs its own decision, never a re-capture
 * to make a test pass.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import App from '../../App';
import { Disclosure } from '../Disclosure';
import { Categories } from '../Setup/Categories';
import { CustomEntry } from '../Setup/CustomEntry';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import { categories, disclosures, localhostReason, readBack, waitingNote } from './setupCases';
import { PIN } from './setupPin';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

const noop = () => undefined;

async function addAnd(check: Parameters<typeof CustomEntry>[0]['check']) {
  const view = render(<CustomEntry add={async () => ['example.com', 'www.example.com']} check={check} />);
  await userEvent.type(screen.getByLabelText('Address to protect'), 'Example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
  await screen.findByText(/example\.com, www\.example\.com/);
  return view.container.innerHTML;
}

async function refusedWith(problem: unknown) {
  const view = render(
    <CustomEntry
      add={async () => {
        throw problem;
      }}
    />,
  );
  await userEvent.type(screen.getByLabelText('Address to protect'), 'localhost');
  await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
  await screen.findByRole('status');
  return view.container.innerHTML;
}

/** Every pinned state, by name, as a function that renders it and returns its markup. */
export const states: Record<string, () => Promise<string>> = {
  'categories, none': async () => render(<Categories categories={[]} onToggle={noop} />).container.innerHTML,
  'categories, some on, some edited': async () =>
    render(<Categories categories={categories} onToggle={noop} />).container.innerHTML,
  'categories, with a note': async () =>
    render(<Categories categories={categories} onToggle={noop} note={waitingNote} />).container.innerHTML,
  'address, nothing typed': async () => render(<CustomEntry add={async () => []} />).container.innerHTML,
  'address, typed': async () => {
    const view = render(<CustomEntry add={async () => []} />);
    await userEvent.type(screen.getByLabelText('Address to protect'), 'example.com');
    return view.container.innerHTML;
  },
  'address added, read back in force': () => addAnd(async () => readBack('in_force')),
  'address added, read back off': () => addAnd(async () => readBack('off')),
  'address added, read back not confirmed': () => addAnd(async () => readBack('not_verified')),
  'address added, read back could not be made': () =>
    addAnd(async () => {
      throw 'no read-back';
    }),
  'address refused, with a reason': () => refusedWith({ reason: localhostReason, kind: 'keeps_the_machine_working' }),
  'address refused, with a sentence': () => refusedWith('Cairn could not reach its settings just now.'),
  'address refused, with nothing readable': () => refusedWith(42),
  'disclosure, with details': async () =>
    render(<Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />).container.innerHTML,
  'disclosure, details loading': async () => {
    core = installFakeCore({ get_disclosures: never });
    return render(<Disclosure onConfirm={noop} onBack={noop} />).container.innerHTML;
  },
  'disclosure, details could not be read': async () => {
    core = installFakeCore({
      get_disclosures: () => {
        throw 'unreadable';
      },
    });
    const view = render(<Disclosure onConfirm={noop} onBack={noop} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return view.container.innerHTML;
  },
  'disclosure, details fetched': async () => {
    core = installFakeCore({ get_disclosures: () => disclosures });
    const view = render(<Disclosure onConfirm={noop} onBack={noop} />);
    await screen.findByText(disclosures.administrator);
    return view.container.innerHTML;
  },
  'the choosing step through App, in Current': async () => {
    core = installFakeCore({
      get_protection_state: () => readBack('off'),
      list_categories: () => categories,
      get_disclosures: () => disclosures,
    });
    const view = render(<App devBuild />);
    await screen.findByText('Gambling');
    const column = view.container.querySelector('main > div.mx-auto.flex.max-w-3xl') as HTMLElement;
    return column.innerHTML;
  },
};

describe("the setup screens outside a notebook page render today's markup (SC-009)", () => {
  it('pins every state it names, and no other', () => {
    expect(Object.keys(PIN).sort()).toEqual(Object.keys(states).sort());
  });

  it.each(Object.keys(states))('%s', async (name) => {
    expect(await states[name]!()).toBe(PIN[name]);
  });
});

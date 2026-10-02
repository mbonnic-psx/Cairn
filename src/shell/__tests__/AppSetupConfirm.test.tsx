/**
 * Through the real `App` (slice `loose-ends`, T004; carries setup-pages T024): "Yes, set this up" pressed on the
 * notebook page leads where it leads in Current, both ways, in every look. The core is a fake written in the test
 * tree at the one seam the interface calls it through; no command is answered that the screens do not ask.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../App';
import type { CategoryPreset } from '../../ipc';
import { protectionWords } from '../../ipc';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import {
  categories as cases,
  disclosures,
  localhostReason,
  readBack,
} from '../../screens/__tests__/setupCases';

const refusal = 'Cairn could not finish setting this up.';

let core: FakeCore;
let list: CategoryPreset[];
let turnOn: () => unknown;

beforeEach(() => {
  list = cases.map((c) => ({ ...c }));
  turnOn = () => ({ ...readBack('in_force'), since: 1_700_000_000 });
  core = installFakeCore({
    get_protection_state: () => readBack('off'),
    list_categories: () => list.map((c) => ({ ...c })),
    get_disclosures: () => disclosures,
    set_category_enabled: (args) => {
      list.find((c) => c.id === args.id)!.enabled = Boolean(args.on);
      return null;
    },
    add_custom_entry: (args) => {
      if (args.input === 'localhost') throw { reason: localhostReason, kind: 'keeps_the_machine_working' };
      return ['example.com', 'www.example.com'];
    },
    turn_protection_on: () => turnOn(),
    get_trail: () => ({ entries: [], enabled_categories: [] }),
  });
});
afterEach(() => core.remove());

/** The choosing spread in `look`, with News ticked, an address added, then a reason shown for a second one. */
async function toDisclosure(look: 'Morning' | 'Midday' | 'Night') {
  const view = render(<App devBuild />);
  await screen.findByText('Gambling');
  await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), look);
  await userEvent.click(screen.getByRole('checkbox', { name: /News/ }));
  const box = screen.getByLabelText('Address to protect') as HTMLInputElement;
  await userEvent.type(box, 'example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
  await screen.findByText(/example\.com, www\.example\.com/);
  await userEvent.type(box, 'localhost');
  await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
  await screen.findByText(localhostReason);
  const ticked = () =>
    (screen.getAllByRole('checkbox') as HTMLInputElement[]).map((b) => [b.id, b.checked] as const);
  const before = ticked();
  await userEvent.click(screen.getByRole('button', { name: 'Turn protection on' }));
  await screen.findByRole('heading', { level: 2, name: 'Before Cairn changes anything' });
  const pagesOf = () =>
    Array.from(view.container.querySelectorAll<HTMLElement>('.nb-page-area > .nb-spread > .nb-page'));
  return { before, ticked, pagesOf };
}

describe.each(['Morning', 'Midday', 'Night'] as const)(
  '"Yes, set this up" on the notebook page, in %s (T004)',
  (look) => {
    it('opens the Protection spread and reads the trail when the core turns protection on', async () => {
      await toDisclosure(look);
      await userEvent.click(screen.getByRole('button', { name: 'Yes, set this up' }));

      expect(await screen.findByRole('heading', { name: protectionWords.in_force.title })).toBeInTheDocument();
      expect(core.calls.map((c) => c.cmd)).toContain('turn_protection_on');
      expect(core.calls.map((c) => c.cmd)).toContain('get_trail');
      expect(screen.queryByRole('heading', { name: 'What would you like to protect?' })).toBeNull();
    });

    it("returns to the choosing spread with the core's sentence on its left page, every box as it was, when it is refused", async () => {
      turnOn = () => {
        throw refusal;
      };
      const { before, ticked, pagesOf } = await toDisclosure(look);
      await userEvent.click(screen.getByRole('button', { name: 'Yes, set this up' }));

      await screen.findByRole('heading', { level: 2, name: 'What would you like to protect?' });
      const [left] = pagesOf();
      expect(within(left!).getByText(refusal)).toBeInTheDocument();
      expect(ticked()).toEqual(before);
      expect(screen.getByRole('checkbox', { name: /News/ })).toBeChecked();
      expect(core.calls.map((c) => c.cmd)).not.toContain('get_trail');
    });
  },
);

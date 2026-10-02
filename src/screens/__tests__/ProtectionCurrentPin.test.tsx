/**
 * The pin (slice 004 `protection-page`, T001): today's markup of the
 * Protection and What is protected screens, every state, outside any shell.
 *
 * The records live in `beforeTheReveal.ts`. Captured from the code as it stood before the slice changed either screen,
 * and seen passing there. Outside a notebook page both screens must render
 * exactly this, element for element (SC-009), so Current and every existing
 * screen test are unchanged. A change here is a change to today's interface:
 * it needs its own decision, never a re-capture to make a test pass.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Protection } from '../Protection';
import { Trail } from '../Trail';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import { cases, trailCases } from './pinCases';
import { PROTECTION, TRAIL } from './beforeTheReveal';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

describe("Protection outside a notebook page renders today's markup (SC-009)", () => {
  it('while the machine is being checked', () => {
    core = installFakeCore({ get_protection_state: never });
    const { container } = render(<Protection />);
    expect(container.innerHTML).toBe(PROTECTION['checking']);
  });

  it('when the read could not be made', async () => {
    core = installFakeCore({
      get_protection_state: () => {
        throw 'Cairn could not read its settings just now.';
      },
    });
    const { container } = render(<Protection />);
    await screen.findByText('Cairn could not read its settings just now.');
    expect(container.innerHTML).toBe(PROTECTION['trouble']);
  });

  it.each(Object.keys(cases))('%s', (name) => {
    const { container } = render(<Protection {...cases[name]!} />);
    expect(container.innerHTML).toBe(PROTECTION[name]);
  });
});

describe("What is protected outside a notebook page renders today's markup (SC-009)", () => {
  it.each(Object.keys(trailCases))('%s', (name) => {
    const { container } = render(<Trail {...trailCases[name]!} />);
    expect(container.innerHTML).toBe(TRAIL[name]);
  });
});

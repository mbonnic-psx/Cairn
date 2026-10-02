/**
 * The pin (slice 004 `quiet-pages`, T001): today's markup of What Cairn covers and This machine is as it
 * was, every shape, outside any shell.
 *
 * The records live in `beforeTheReveal.ts`. Captured from the code as it stood before the slice changed either screen (`b73df5b`), and seen passing
 * there. Outside a notebook page both screens must render exactly this, element for element (SC-009), so
 * Current and every existing screen test are unchanged. A change here is a change to today's interface: it
 * needs its own decision, never a re-capture to make a test pass.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Limits } from '../Limits';
import { Teardown } from '../Teardown';
import { LIMITS, TEARDOWN } from './beforeTheReveal';
import { disclosureCases, teardownCases } from './quietCases';

describe('What Cairn covers, outside any shell, is today\'s markup', () => {
  it.each(Object.entries(disclosureCases))('%s', (name, disclosures) => {
    const { container } = render(<Limits disclosures={disclosures} />);
    expect(container.innerHTML).toBe(LIMITS[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(LIMITS).sort()).toEqual(Object.keys(disclosureCases).sort());
  });
});

describe('This machine is as it was, outside any shell, is today\'s markup', () => {
  it.each(Object.entries(teardownCases))('%s', (name, report) => {
    const { container } = render(<Teardown report={report} />);
    expect(container.innerHTML).toBe(TEARDOWN[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(TEARDOWN).sort()).toEqual(Object.keys(teardownCases).sort());
  });
});

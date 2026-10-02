/**
 * The guards on adding an address by hand, in both layouts: whitespace is not an address, a submit never
 * navigates the page, and a reason that no longer applies does not sit beside a success. The core is a fake
 * written here.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { ProtectionState } from '../../ipc';
import { NotebookPageContext } from '../../shell/notebookPage';
import { CustomEntry } from '../Setup/CustomEntry';

const inForce: ProtectionState = {
  status: 'in_force',
  since: null,
  verified_at: null,
  entry_count_verified: 0,
};

/** An add seam that answers from a script and remembers what it was asked. */
function fakeAdd(answers: Array<{ reject: unknown } | { domains: string[] }>) {
  const calls: string[] = [];
  const add = async (input: string) => {
    calls.push(input);
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
    if ('reject' in answer) throw answer.reject;
    return answer.domains;
  };
  return { add, calls };
}

const check = async () => inForce;

const layouts = [
  { name: 'on a notebook page', onPage: true },
  { name: 'outside any shell', onPage: false },
];

describe.each(layouts)('adding an address $name', ({ onPage }) => {
  function show(add: (input: string) => Promise<string[]>) {
    return render(
      <NotebookPageContext.Provider value={onPage}>
        <CustomEntry add={add} check={check} />
      </NotebookPageContext.Provider>,
    );
  }

  it('treats whitespace as no address: the button is disabled', async () => {
    const { add } = fakeAdd([{ domains: ['example.com'] }]);
    show(add);

    await userEvent.type(screen.getByLabelText(/address/i), '   ');

    expect(screen.getByRole('button', { name: /protect it/i })).toBeDisabled();
  });

  it('does nothing when whitespace is submitted past the button', () => {
    const { add, calls } = fakeAdd([{ domains: ['example.com'] }]);
    const view = show(add);

    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '   ' } });
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);

    expect(calls).toEqual([]);
    expect(screen.queryByRole('status')).toBeNull();
    expect(view.container.textContent).not.toMatch(/added|protected/i);
  });

  it('keeps the form from navigating the page on submit', () => {
    const { add } = fakeAdd([{ domains: ['example.com'] }]);
    const view = show(add);

    const notPrevented = fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);

    expect(notPrevented).toBe(false);
  });

  it('drops an earlier reason once an address is added', async () => {
    const reason = 'That does not look like a web address. Try example.com.';
    const { add } = fakeAdd([{ reject: { reason, kind: 'not_an_address' } }, { domains: ['example.com'] }]);
    show(add);
    const button = () => screen.getByRole('button', { name: /protect it/i });

    await userEvent.type(screen.getByLabelText(/address/i), 'nonsense');
    await userEvent.click(button());
    expect(await screen.findByRole('status')).toHaveTextContent(reason);

    await userEvent.clear(screen.getByLabelText(/address/i));
    await userEvent.type(screen.getByLabelText(/address/i), 'example.com');
    await userEvent.click(button());

    expect(await screen.findByText(/Protected: example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(reason)).toBeNull();
  });
});

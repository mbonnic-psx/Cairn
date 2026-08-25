/**
 * Adding an address, and being turned away kindly.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CustomEntry } from '../Setup/CustomEntry';

describe('adding an address', () => {
  it('shows what was actually protected, not what was typed', async () => {
    const add = vi.fn().mockResolvedValue(['example.com', 'www.example.com']);
    render(<CustomEntry add={add} />);

    await userEvent.type(screen.getByLabelText(/address/i), 'HTTPS://Example.com:8443/x');
    await userEvent.click(screen.getByRole('button', { name: /protect it/i }));

    expect(add).toHaveBeenCalledWith('HTTPS://Example.com:8443/x');
    expect(await screen.findByText(/example\.com, www\.example\.com/)).toBeInTheDocument();
  });

  it('shows a rejection reason exactly as it was written', async () => {
    const reason =
      'Cairn keeps localhost working — the machine and Cairn itself use it to reach things on this computer. Try the address of a site instead.';
    const add = vi.fn().mockRejectedValue({ reason, kind: 'keeps_the_machine_working' });
    render(<CustomEntry add={add} />);

    await userEvent.type(screen.getByLabelText(/address/i), 'localhost');
    await userEvent.click(screen.getByRole('button', { name: /protect it/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(reason);
  });

  it('says nothing about failure when an address cannot be taken', async () => {
    const add = vi
      .fn()
      .mockRejectedValue({ reason: 'That does not look like a web address. Try example.com.', kind: 'not_an_address' });
    render(<CustomEntry add={add} />);

    await userEvent.type(screen.getByLabelText(/address/i), 'nonsense');
    await userEvent.click(screen.getByRole('button', { name: /protect it/i }));

    const text = (await screen.findByRole('status')).textContent?.toLowerCase() ?? '';
    for (const word of ['failed', 'denied', 'invalid', 'error']) {
      expect(text).not.toContain(word);
    }
  });

  it('does nothing at all with an empty address', async () => {
    const add = vi.fn();
    render(<CustomEntry add={add} />);

    expect(screen.getByRole('button', { name: /protect it/i })).toBeDisabled();
    expect(add).not.toHaveBeenCalled();
  });
});

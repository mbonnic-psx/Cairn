/**
 * Adding an address, and being turned away kindly.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProtectionState, ProtectionStatus } from '../../ipc';
import { CustomEntry } from '../Setup/CustomEntry';

/** A read-back of the machine, as the core would answer it. */
const readBack = (status: ProtectionStatus): ProtectionState => ({
  status,
  since: null,
  verified_at: null,
  entry_count_verified: 0,
});

describe('adding an address', () => {
  it('shows what was actually protected, not what was typed', async () => {
    const add = vi.fn().mockResolvedValue(['example.com', 'www.example.com']);
    render(<CustomEntry add={add} check={async () => readBack('off')} />);

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

/**
 * Principle III: what the screen says about an address is what the machine
 * shows, read back after it was added — never what Cairn meant to do.
 */
describe('what adding an address claims', () => {
  async function addExample(status: ProtectionStatus | 'unreadable') {
    const add = vi.fn().mockResolvedValue(['example.com', 'www.example.com']);
    const check = vi.fn(async () => {
      if (status === 'unreadable') throw 'Cairn could not read the system just now.';
      return readBack(status);
    });
    render(<CustomEntry add={add} check={check} />);

    await userEvent.type(screen.getByLabelText(/address/i), 'example.com');
    await userEvent.click(screen.getByRole('button', { name: /protect it/i }));
    await screen.findByText(/example\.com, www\.example\.com/);
    return check;
  }

  it('does not say protected before protection is on', async () => {
    await addExample('off');

    const line = screen.getByText(/example\.com, www\.example\.com/);
    expect(line).not.toHaveTextContent(/protected/i);
    expect(line).toHaveTextContent(/added/i);
    expect(line).toHaveTextContent(/once protection is on/i);
  });

  it('does not say protected when the machine could not be checked', async () => {
    await addExample('not_verified');

    const line = screen.getByText(/example\.com, www\.example\.com/);
    expect(line).not.toHaveTextContent(/^protected/i);
    expect(line).toHaveTextContent(/added/i);
    expect(line).toHaveTextContent(/not confirmed/i);
  });

  it('does not say protected when the read-back itself does not come back', async () => {
    await addExample('unreadable');

    const line = screen.getByText(/example\.com, www\.example\.com/);
    expect(line).not.toHaveTextContent(/^protected/i);
    expect(line).toHaveTextContent(/not confirmed/i);
  });

  it('says protected only once the machine shows it in force', async () => {
    const check = await addExample('in_force');

    expect(check).toHaveBeenCalled();
    expect(screen.getByText(/example\.com, www\.example\.com/)).toHaveTextContent(
      /^Protected: example\.com, www\.example\.com$/,
    );
  });
});

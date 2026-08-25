/**
 * Nothing changes on this machine until someone has read what changes.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Disclosure } from '../Disclosure';
import type { Disclosures } from '../../ipc';

const disclosures: Disclosures = {
  in_force: ['Protected sites are blocked for every application that asks this machine.'],
  not_covered: [
    'An application that looks up addresses on its own is not covered in this release.',
  ],
  helper: 'Cairn will ask once for permission to install a small background component.',
  encryption: 'What Cairn records is encrypted on this machine.',
  administrator:
    'Someone with administrator access to this machine can undo what Cairn does.',
};

describe('the disclosure before the first change', () => {
  it('names what is not covered rather than implying coverage', () => {
    render(<Disclosure disclosures={disclosures} onConfirm={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText(/looks up addresses on its own/i)).toBeInTheDocument();
    expect(screen.getByText(/what this does not cover/i)).toBeInTheDocument();
  });

  it('states the administrator caveat plainly', () => {
    render(<Disclosure disclosures={disclosures} onConfirm={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText(/administrator access/i)).toBeInTheDocument();
  });

  it('lets someone walk away without confirming', async () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    render(<Disclosure disclosures={disclosures} onConfirm={onConfirm} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /not yet/i }));

    expect(onBack).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms explicitly, never by default', async () => {
    const onConfirm = vi.fn();
    render(<Disclosure disclosures={disclosures} onConfirm={onConfirm} onBack={vi.fn()} />);

    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /yes, set this up/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

/**
 * The list of what was chosen, and what it claims about the machine.
 *
 * Principle III: the list is what the person chose. It is called protected
 * only while the machine shows it in force.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Trail, trailTitle } from '../Trail';

const trail = {
  entries: [{ domain: 'example.com', sources: [], auto_www: false }],
  enabled_categories: [],
};

describe('the list of what was chosen', () => {
  it('calls it protecting while it is in force', () => {
    render(<Trail trail={trail} status="in_force" />);

    expect(screen.getByRole('heading')).toHaveTextContent('What you are protecting');
    expect(trailTitle('in_force')).toBe('What is protected');
  });

  it('does not call it protected while it is not confirmed', () => {
    render(<Trail trail={trail} status="not_verified" />);

    expect(screen.getByRole('heading')).not.toHaveTextContent(/protecting|protected/i);
    expect(screen.getByText(/not confirmed/i)).toBeInTheDocument();
    expect(trailTitle('not_verified')).not.toMatch(/is protected/i);
  });

  it('does not call it protected before protection is on', () => {
    render(<Trail trail={trail} status="off" />);

    expect(screen.getByRole('heading')).not.toHaveTextContent(/protecting|protected/i);
    expect(trailTitle('off')).not.toMatch(/is protected/i);
  });
});

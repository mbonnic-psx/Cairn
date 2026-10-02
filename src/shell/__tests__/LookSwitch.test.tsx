import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LookSwitch } from '../../look/LookSwitch';

describe('LookSwitch', () => {
  it('is labelled "Look (testing)" and offers Current and Morning', () => {
    render(<LookSwitch look="current" onChange={vi.fn()} />);
    const control = screen.getByLabelText('Look (testing)');
    expect(control).toHaveValue('current');
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(['Current', 'Morning']);
  });

  it('shows the look it is given', () => {
    render(<LookSwitch look="morning" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Look (testing)')).toHaveValue('morning');
  });

  it('reports the choice', async () => {
    const onChange = vi.fn();
    render(<LookSwitch look="current" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), 'Morning');
    expect(onChange).toHaveBeenCalledWith('morning');
  });

  it('is reachable and operable by keyboard', async () => {
    const onChange = vi.fn();
    render(<LookSwitch look="current" onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByLabelText('Look (testing)')).toHaveFocus();
    // A native select: the browser's own arrow keys change it (jsdom does not
    // model that), so the choice is made while it holds focus.
    expect(screen.getByLabelText('Look (testing)').tagName).toBe('SELECT');
    await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), 'morning');
    expect(onChange).toHaveBeenCalledWith('morning');
    expect(screen.getByLabelText('Look (testing)')).toHaveFocus();
  });

  it('carries the nb-switch class', () => {
    render(<LookSwitch look="current" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Look (testing)').closest('.nb-switch')).not.toBeNull();
  });
});

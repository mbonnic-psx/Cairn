import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LookSwitch } from '../../look/LookSwitch';

describe('LookSwitch', () => {
  it('is labelled "Look (testing)" and offers Morning, Midday and Night, in that order', () => {
    render(<LookSwitch look="morning" onChange={vi.fn()} />);
    const control = screen.getByLabelText('Look (testing)');
    expect(control).toHaveValue('morning');
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(['Morning', 'Midday', 'Night']);
  });

  it('shows the look it is given', () => {
    render(<LookSwitch look="morning" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Look (testing)')).toHaveValue('morning');
  });

  it('reports the choice', async () => {
    const onChange = vi.fn();
    render(<LookSwitch look="morning" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), 'Night');
    expect(onChange).toHaveBeenCalledWith('night');
  });

  it('reports Midday and then Night', async () => {
    const onChange = vi.fn();
    render(<LookSwitch look="morning" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), 'Midday');
    await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), 'Night');
    expect(onChange.mock.calls).toEqual([['midday'], ['night']]);
  });

  it('is reachable and operable by keyboard', async () => {
    const onChange = vi.fn();
    render(<LookSwitch look="morning" onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByLabelText('Look (testing)')).toHaveFocus();
    // A native select: the browser's own arrow keys change it (jsdom does not
    // model that), so the choice is made while it holds focus.
    expect(screen.getByLabelText('Look (testing)').tagName).toBe('SELECT');
    await userEvent.selectOptions(screen.getByLabelText('Look (testing)'), 'midday');
    expect(onChange).toHaveBeenCalledWith('midday');
    expect(screen.getByLabelText('Look (testing)')).toHaveFocus();
  });

  it('carries the nb-switch class', () => {
    render(<LookSwitch look="morning" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Look (testing)').closest('.nb-switch')).not.toBeNull();
  });
});

describe('LookSwitch on every sky', () => {
  const root = () => screen.getByLabelText('Look (testing)').closest('.nb-switch') as HTMLElement;

  it.each(['morning', 'midday', 'night'] as const)('wears the %s look on its own root', (look) => {
    render(<LookSwitch look={look} onChange={vi.fn()} />);
    expect(root()).toHaveAttribute('data-look', look);
  });

  it('on morning keeps its label, place and style', () => {
    render(<LookSwitch look="morning" onChange={vi.fn()} />);
    const label = root();
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('data-look', 'morning');
    expect([...label.attributes].map((a) => a.name).sort()).toEqual(['class', 'data-look', 'style']);
    expect(label.className).toBe('nb-switch');
    expect(label.getAttribute('style')).toBe(
      'position: fixed; top: 8px; right: 12px; z-index: 50; font-size: 11px; display: flex; gap: 6px; align-items: center;',
    );
    expect(label.querySelector('span')?.textContent).toBe('Look (testing)');
  });
});


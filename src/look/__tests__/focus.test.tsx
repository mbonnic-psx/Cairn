/// <reference types="vite/client" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LookSwitch } from '../LookSwitch';

// Vitest blanks CSS imports and this project carries no Node typings; read the file from disk.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const notebook = readFileSync('src/styles/notebook.css', 'utf8');

describe('the look switch focus ring', () => {
  it('is drawn by a rule that matches the element that really takes focus', async () => {
    render(<LookSwitch look="morning" onChange={vi.fn()} />);
    await userEvent.tab();
    const focused = document.activeElement as HTMLElement;
    expect(focused.tagName).toBe('SELECT');
    const rule = notebook.match(/([^{}]*:focus-visible[^{}]*)\{[^}]*outline:[^}]*\}/g)!.join(',');
    const selectors = rule
      .replace(/\{[^}]*\}/g, '')
      .split(',')
      .map((x) => x.replace(/:focus-visible/, '').trim())
      .filter((x) => x.includes('.nb-switch'));
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.some((sel) => focused.matches(sel))).toBe(true);
    expect(screen.getByText('Look (testing)').closest('label')).not.toHaveFocus();
  });
});

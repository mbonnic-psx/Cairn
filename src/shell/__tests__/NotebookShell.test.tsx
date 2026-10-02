/// <reference types="vite/client" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Tab } from '../../navigation';
import { tabsFor } from '../../navigation';
import { NotebookShell } from '../NotebookShell';
import source from '../NotebookShell.tsx?raw';

const fakeTabs: Tab[] = [
  { id: 'protection', label: 'Protection', current: false },
  { id: 'reaches', label: 'Today', current: true },
  { id: 'checkin', label: 'Tonight', current: false },
];

function shell(tabs: Tab[] = fakeTabs, onSelect = vi.fn()) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={onSelect}>
      <p>the screen</p>
    </NotebookShell>,
  );
  return { onSelect, ...view };
}

describe('NotebookShell tabs', () => {
  it('renders every tab as a button with exactly its name', () => {
    shell();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Protection', 'Today', 'Tonight']);
  });

  it('marks the current tab, and only it, as the current page', () => {
    shell();
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Protection' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Tonight' })).not.toHaveAttribute('aria-current');
  });

  it('reports the chosen destination on click', async () => {
    const { onSelect } = shell();
    await userEvent.click(screen.getByRole('button', { name: 'Tonight' }));
    expect(onSelect).toHaveBeenCalledWith('checkin');
  });

  it('reports the chosen destination from the keyboard', async () => {
    const { onSelect } = shell();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Protection' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('protection');
  });

  it('puts the children in one scrolling page area', () => {
    const { container } = shell();
    const area = container.querySelector('.nb-page-area');
    expect(area).not.toBeNull();
    expect(area).toContainElement(screen.getByText('the screen'));
    expect(container.querySelectorAll('.nb-page-area')).toHaveLength(1);
  });

  it('renders no tab for an id tabsFor does not return', () => {
    shell(tabsFor('choosing', false));
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Protection', 'Tonight', 'What Cairn covers']);
  });

  it('wears the morning look', () => {
    const { container } = shell();
    expect(container.firstElementChild).toHaveAttribute('data-look', 'morning');
    expect(container.querySelector('.nb-spread')).not.toBeNull();
    expect(container.querySelector('.nb-page')).not.toBeNull();
  });
});

describe('NotebookShell assembly', () => {
  it('shows the mark, the greeting and the landscape around the untouched children', () => {
    const { container } = shell();
    expect(screen.getByRole('img', { name: 'Cairn' })).toBeInTheDocument();
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="landscape"]')).not.toBeNull();
    expect(screen.getByText('the screen')).toBeInTheDocument();
  });

  it('imports nothing reach-related and shows no count', () => {
    const src = source;
    expect(src).not.toMatch(/reaches/i);
    expect(src).not.toMatch(/ipc/);
  });
});

/// <reference types="vite/client" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { NotebookLook } from '../../look/look';
import type { Tab } from '../../navigation';
import { tabsFor } from '../../navigation';
import { NotebookShell } from '../NotebookShell';
import source from '../NotebookShell.tsx?raw';

const fakeTabs: Tab[] = [
  { id: 'protection', label: 'Protection', current: false },
  { id: 'reaches', label: 'Today', current: true },
  { id: 'checkin', label: 'Tonight', current: false },
];

function shell(tabs: Tab[] = fakeTabs, onSelect = vi.fn(), look: NotebookLook = 'morning') {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={onSelect} look={look}>
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

describe('NotebookShell by look', () => {
  it('midday: data-look, the midday words, a sun and no moon', () => {
    const { container } = shell(fakeTabs, vi.fn(), 'midday');
    expect(container.firstElementChild).toHaveAttribute('data-look', 'midday');
    expect(screen.getByText('Midday.')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="sun"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="moon"]')).toBeNull();
  });

  it('night: data-look, the evening words, the moon and the stars', () => {
    const { container } = shell(fakeTabs, vi.fn(), 'night');
    expect(container.firstElementChild).toHaveAttribute('data-look', 'night');
    expect(screen.getByText('Good evening.')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="moon"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="star"]')).toHaveLength(6);
    expect(container.querySelector('[data-testid="sun"]')).toBeNull();
  });

  it('carries no transition or animation style on anything it renders (D3)', () => {
    for (const look of ['morning', 'midday', 'night'] as const) {
      const { container, unmount } = shell(fakeTabs, vi.fn(), look);
      for (const el of container.querySelectorAll<HTMLElement>('*')) {
        expect(el.style.transition).toBe('');
        expect(el.style.animation).toBe('');
      }
      unmount();
    }
  });
});

describe('NotebookShell assembly', () => {
  it('shows the mark, the greeting and the landscape around the untouched children', () => {
    const { container } = shell();
    expect(container.querySelector('svg.nb-mark')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="landscape"]')).not.toBeNull();
    expect(screen.getByText('the screen')).toBeInTheDocument();
  });

  it('is called "Cairn" once, and the tab landmark is named for what it does', () => {
    const { container } = shell();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeInTheDocument();
    const named = [...container.querySelectorAll('*')].filter(
      (el) =>
        (el.getAttribute('aria-label') === 'Cairn' || (el.children.length === 0 && el.textContent === 'Cairn')) &&
        el.closest('[aria-hidden="true"]') === null,
    );
    expect(named).toHaveLength(1);
  });

  it('draws one margin line, hidden from assistive tech, beside the page area', () => {
    const { container } = shell();
    const margins = container.querySelectorAll('.nb-margin');
    expect(margins).toHaveLength(1);
    expect(margins[0]).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.nb-notebook')).toContainElement(margins[0] as HTMLElement);
  });

  it('gives a page slice the spread classes to build on', () => {
    const { container } = render(
      <NotebookShell tabs={fakeTabs} onSelect={vi.fn()} look="morning">
        <div className="nb-page nb-page--ruled">ruled</div>
      </NotebookShell>,
    );
    expect(container.querySelector('.nb-page--ruled')).not.toBeNull();
    expect(container.querySelector('.nb-spread')).toContainElement(container.querySelector('.nb-page--ruled') as HTMLElement);
  });

  it('imports nothing reach-related and shows no count', () => {
    const src = source;
    expect(src).not.toMatch(/reaches/i);
    expect(src).not.toMatch(/ipc/);
  });
});

describe('NotebookShell heading outline', () => {
  it('opens on one hidden "Cairn" h1, the first heading in the shell', () => {
    const { container } = shell();
    const h1 = screen.getByRole('heading', { level: 1, name: 'Cairn' });
    expect(h1).toHaveClass('sr-only');
    expect(screen.getAllByRole('heading')[0]).toBe(h1);
    expect(container.querySelector('.nb-root')?.firstElementChild).toBe(h1);
  });

  it('hides the title bar name from assistive technology', () => {
    const { container } = shell();
    expect(container.querySelector('.nb-titlebar__name')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the greeting as words in a paragraph, not a heading, in each look', () => {
    const words = { morning: 'Good morning.', midday: 'Midday.', night: 'Good evening.' } as const;
    for (const look of ['morning', 'midday', 'night'] as const) {
      const { container, unmount } = shell(fakeTabs, vi.fn(), look);
      const el = container.querySelector('.nb-greeting__words');
      expect(el?.tagName).toBe('P');
      expect(el).toHaveTextContent(words[look]);
      expect(screen.queryByRole('heading', { name: words[look] })).toBeNull();
      unmount();
    }
  });

  it('lists "Cairn" then a screen\'s own h2 and nothing else', () => {
    render(
      <NotebookShell tabs={fakeTabs} onSelect={vi.fn()} look="morning">
        <h2>The page</h2>
      </NotebookShell>,
    );
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['Cairn', 'The page']);
  });
});

describe('NotebookShell tab labels on every webview', () => {
  // WebKitGTK (Tauri on Linux) ignores writing-mode on a <button>, so the
  // sideways label lives on an inner span that every engine turns.
  it('puts each tab name in its own label span inside the button', () => {
    shell();
    for (const button of screen.getAllByRole('button')) {
      const label = button.querySelector(':scope > .nb-tab-label');
      expect(label?.textContent).toBe(button.textContent);
    }
  });
});

describe('NotebookShell looks', () => {
  it('admits only the three notebook looks (type-level, proved by tsc)', () => {
    render(
      // @ts-expect-error Current is not a notebook look (contracts/ui-shell.md, FR-013b)
      <NotebookShell tabs={fakeTabs} onSelect={vi.fn()} look="current">
        <p>x</p>
      </NotebookShell>,
    );
  });
});

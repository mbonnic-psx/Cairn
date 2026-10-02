import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { tabsFor } from '../../navigation';
import { CurrentShell } from '../CurrentShell';

function shell(onSelect = vi.fn()) {
  return render(
    <CurrentShell tabs={tabsFor('protected', true, 'in_force')} onSelect={onSelect}>
      <p>the screen</p>
    </CurrentShell>,
  );
}

describe('CurrentShell', () => {
  it('shows the Cairn heading and a header of buttons with today\'s names', () => {
    shell();
    expect(screen.getByRole('heading', { name: 'Cairn', level: 1 })).toBeInTheDocument();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Protection', 'What is protected', 'Today', 'Tonight', 'What Cairn covers']);
  });

  it('marks the protection tab as the current page, and no other', () => {
    shell();
    expect(screen.getByRole('button', { name: 'Protection' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Tonight' })).not.toHaveAttribute('aria-current');
  });

  it('tells the caller which destination was chosen', async () => {
    const onSelect = vi.fn();
    shell(onSelect);
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onSelect).toHaveBeenCalledWith('reaches');
  });

  it('wraps the children in today\'s single column inside main', () => {
    const { container } = shell();
    const main = container.querySelector('main');
    expect(main).toHaveClass('min-h-screen', 'px-6', 'py-12', 'sm:px-10');
    const column = screen.getByText('the screen').parentElement;
    expect(column).toHaveClass('mx-auto', 'flex', 'max-w-3xl', 'flex-col', 'gap-6');
    expect(main?.querySelector('header nav')).not.toBeNull();
  });
});

/**
 * The choosing step (slice `setup-pages`, T003–T007): off a page it is today's three elements in today's order;
 * on a notebook page it is one spread. Rendered with props, the core a fake written in this tree.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../components/Button';
import { Categories } from '../Setup/Categories';
import { Choosing } from '../Setup/Choosing';
import { CustomEntry } from '../Setup/CustomEntry';
import { categories, waitingNote } from './setupCases';

const noop = () => undefined;

describe('Choosing outside any shell (T003)', () => {
  it("renders today's elements in today's order, with no wrapper", () => {
    const view = render(
      <Choosing categories={categories} onToggle={noop} note={waitingNote} onTurnOn={noop} />,
    );
    const mine = view.container.innerHTML;
    view.unmount();

    const by = render(
      <>
        <Categories categories={categories} onToggle={noop} note={waitingNote} />
        <CustomEntry />
        <div className="flex justify-end">
          <Button>Turn protection on</Button>
        </div>
      </>,
    );
    expect(mine).toBe(by.container.innerHTML);
  });

  it('calls onTurnOn once when "Turn protection on" is chosen', async () => {
    const onTurnOn = vi.fn();
    render(<Choosing categories={categories} onToggle={noop} onTurnOn={onTurnOn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Turn protection on' }));
    expect(onTurnOn).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle(id, false) when a ticked category is unticked', async () => {
    const onToggle = vi.fn();
    render(<Choosing categories={categories} onToggle={onToggle} onTurnOn={noop} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Social/ }));
    expect(onToggle).toHaveBeenCalledWith('social', false);
  });

  it('passes the note through', () => {
    render(<Choosing categories={categories} onToggle={noop} note={waitingNote} onTurnOn={noop} />);
    expect(screen.getByText(waitingNote)).toBeInTheDocument();
  });
});

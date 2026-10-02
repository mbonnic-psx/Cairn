/**
 * The choosing step (slice `setup-pages`, T003–T007): off a page it is today's three elements in today's order;
 * on a notebook page it is one spread. Rendered with props, the core a fake written in this tree.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../components/Button';
import { NotebookShell } from '../../shell/NotebookShell';
import type { NotebookLook } from '../../look/look';
import { Categories } from '../Setup/Categories';
import { Choosing } from '../Setup/Choosing';
import { CustomEntry } from '../Setup/CustomEntry';
import { categories, readBack, waitingNote } from './setupCases';

const noop = () => undefined;

const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];

/** Render inside the notebook, in a look: the screen is then on a page. */
function onPage(ui: React.ReactElement, look: NotebookLook = 'morning') {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  return { ...view, main };
}

/** The text a screen has outside any shell: what the words on a page must equal. */
function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const text = view.container.textContent ?? '';
  view.unmount();
  return text;
}

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

describe('Categories on a notebook page (T004)', () => {
  it('puts the heading and its sentence on the page, with no card and no entrance', () => {
    const { main } = onPage(<Categories categories={categories} onToggle={noop} />);
    expect(within(main).getByRole('heading', { level: 2, name: 'What would you like to protect?' })).toBeInTheDocument();
    expect(within(main).getByText(/Each of these is a starting list/)).toBeInTheDocument();
    expect(main.querySelector('.settle')).toBeNull();
    expect(main.querySelector('section.rounded-2xl')).toBeNull();
    expect(main.querySelector('section.nb-categories')).not.toBeNull();
  });

  it('draws one label per category wrapping a checkbox, its name and its count', () => {
    const { main } = onPage(<Categories categories={categories} onToggle={noop} />);
    const labels = Array.from(main.querySelectorAll('label'));
    expect(labels).toHaveLength(categories.length);
    labels.forEach((label, i) => {
      const category = categories[i]!;
      expect(within(label).getByRole('checkbox')).toHaveProperty('checked', category.enabled);
      expect(label.textContent).toContain(category.label);
      expect(label.textContent).toContain(`${category.entry_count} addresses`);
      expect(label.textContent?.includes('· edited by you')).toBe(category.edited);
    });
  });

  it('follows enabled, and calls onToggle(id, checked) on a change', async () => {
    const onToggle = vi.fn();
    const { main } = onPage(<Categories categories={categories} onToggle={onToggle} />);
    await userEvent.click(within(main).getByRole('checkbox', { name: /Shopping/ }));
    expect(onToggle).toHaveBeenLastCalledWith('shopping', true);
    await userEvent.click(within(main).getByRole('checkbox', { name: /Social/ }));
    expect(onToggle).toHaveBeenLastCalledWith('social', false);
  });

  it("carries none of today's card-row classes", () => {
    const { main } = onPage(<Categories categories={categories} onToggle={noop} />);
    for (const label of Array.from(main.querySelectorAll('label'))) {
      expect(label.className).not.toMatch(/border-sand-200|hover:bg-sand-100|transition-colors|duration-200/);
    }
  });

  it('shows the note a change leaves, after the categories, when there is one', () => {
    const { main } = onPage(<Categories categories={categories} onToggle={noop} note={waitingNote} />);
    const note = within(main).getByText(waitingNote);
    const lastLabel = Array.from(main.querySelectorAll('label')).at(-1)!;
    expect(lastLabel.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(main).queryByText(waitingNote)).not.toBeNull();
  });

  it.each([
    ['some on, some edited', categories, undefined],
    ['with a note', categories, waitingNote],
    ['none', [], undefined],
  ])('says the same words as outside any shell: %s', (_name, list, note) => {
    const ui = <Categories categories={list} onToggle={noop} note={note} />;
    expect(onPage(ui).main.textContent).toBe(outside(ui));
  });

  it('with no categories draws the heading and sentence only', () => {
    const { main } = onPage(<Categories categories={[]} onToggle={noop} />);
    expect(main.querySelectorAll('label')).toHaveLength(0);
    expect(main.querySelector('ul li')).toBeNull();
    expect(within(main).getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});

describe('CustomEntry on a notebook page (T005)', () => {
  const box = (main: HTMLElement) => within(main).getByLabelText('Address to protect') as HTMLInputElement;

  it('puts "Anywhere else?" and its sentence on the page, with no card', () => {
    const { main } = onPage(<CustomEntry add={async () => []} />);
    expect(within(main).getByRole('heading', { level: 2, name: 'Anywhere else?' })).toBeInTheDocument();
    expect(
      within(main).getByText('Type an address and Cairn will protect it, along with its www. form.'),
    ).toBeInTheDocument();
    expect(main.querySelector('.settle')).toBeNull();
    expect(main.querySelector('section.rounded-2xl')).toBeNull();
    expect(main.querySelector('section.nb-custom')).not.toBeNull();
  });

  it('names the box with the hidden label, keeps its id and its placeholder', () => {
    const { main } = onPage(<CustomEntry add={async () => []} />);
    expect(box(main).id).toBe('address');
    expect(box(main).placeholder).toBe('example.com');
    expect(main.querySelector('label[for="address"]')).toHaveClass('sr-only');
  });

  it('keeps "Protect it" disabled while the box is empty and enables it once something is typed', async () => {
    const { main } = onPage(<CustomEntry add={async () => []} />);
    const button = within(main).getByRole('button', { name: 'Protect it' });
    expect(button).toBeDisabled();
    await userEvent.type(box(main), 'example.com');
    expect(button).toBeEnabled();
  });

  it('draws "Protect it" as a plain button and the box without the clay focus', () => {
    const { main } = onPage(<CustomEntry add={async () => []} />);
    const button = within(main).getByRole('button', { name: 'Protect it' });
    expect(button.className).not.toMatch(/transition-colors|duration-200|bg-clay/);
    expect(box(main).className).not.toMatch(/focus:border-clay-500|focus:outline-none/);
  });

  it('submits the typed text to the add seam', async () => {
    const add = vi.fn(async () => ['example.com']);
    const { main } = onPage(<CustomEntry add={add} check={async () => readBack('off')} />);
    await userEvent.type(box(main), 'Example.com/path');
    await userEvent.click(within(main).getByRole('button', { name: 'Protect it' }));
    expect(add).toHaveBeenCalledWith('Example.com/path');
  });

  it('says the same words as outside any shell', () => {
    const ui = <CustomEntry add={async () => []} />;
    expect(onPage(ui).main.textContent).toBe(outside(ui));
  });
});

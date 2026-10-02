import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Tab } from '../../navigation';
import { CurrentShell } from '../CurrentShell';
import { NotebookShell } from '../NotebookShell';
import { useNotebookPage } from '../notebookPage';

const tabs: Tab[] = [{ id: 'protection', label: 'Protection', current: true }];

function Probe() {
  const onPage = useNotebookPage();
  return <p data-testid="probe">{`${typeof onPage}:${String(onPage)}`}</p>;
}

describe('useNotebookPage', () => {
  for (const look of ['morning', 'midday', 'night'] as const) {
    it(`reads true inside NotebookShell in the ${look} look`, () => {
      render(
        <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
          <Probe />
        </NotebookShell>,
      );
      expect(screen.getByTestId('probe')).toHaveTextContent('boolean:true');
    });
  }

  it('reads false inside CurrentShell, and CurrentShell renders what it did', () => {
    const { container } = render(
      <CurrentShell tabs={tabs} onSelect={vi.fn()}>
        <Probe />
      </CurrentShell>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('boolean:false');
    expect(container.querySelector('.nb-root')).toBeNull();
    expect(container.querySelector('main > div.mx-auto')).toContainElement(screen.getByTestId('probe'));
    expect(screen.getByRole('heading', { level: 1, name: 'Cairn' })).toBeInTheDocument();
  });

  it('reads false with no shell at all', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('boolean:false');
  });
});

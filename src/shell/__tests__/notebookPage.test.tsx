import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Tab } from '../../navigation';
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

  it('reads false with no shell at all', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('boolean:false');
  });
});

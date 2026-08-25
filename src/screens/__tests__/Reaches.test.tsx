/**
 * The reaches screen: what happened, and nothing about how to feel about it.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Reaches } from '../Reaches';
import type { TodaysReaches } from '../../ipc/reaches';

const today: TodaysReaches = {
  reaches: [
    { domain: 'example.com', at: 1_700_000_100 },
    { domain: 'news.example', at: 1_700_003_700 },
    { domain: 'example.com', at: 1_700_007_300 },
  ],
  gaps: [],
  coverage_note: null,
  sealed: null,
};

describe('the reaches screen', () => {
  it('shows where and when, and nothing else about a reach', () => {
    render(<Reaches today={today} />);

    expect(screen.getAllByText('example.com')).toHaveLength(2);
    expect(screen.getByText('news.example')).toBeInTheDocument();
  });

  it('neither congratulates nor shames', () => {
    render(<Reaches today={today} />);
    const text = (document.body.textContent ?? '').toLowerCase();

    for (const wrong of [
      'well done',
      'congratulations',
      'good job',
      'only 3',
      'again',
      'slipped',
      'try harder',
      'failed',
      'relapsed',
    ]) {
      expect(text).not.toContain(wrong);
    }
  });

  it('offers nothing to beat: no total, no streak, no comparison', () => {
    render(<Reaches today={today} />);
    const text = document.body.textContent ?? '';

    expect(text).not.toMatch(/streak/i);
    expect(text).not.toMatch(/yesterday/i);
    expect(text).not.toMatch(/\btotal\b/i);
    expect(text).not.toMatch(/\b3 reaches\b/i);
  });

  it('says that counting covers only the time Cairn was running', () => {
    render(<Reaches today={today} />);

    expect(screen.getByText(/only while it is running/i)).toBeInTheDocument();
  });

  it('shows the coverage note when part of the day was not observed', () => {
    render(
      <Reaches
        today={{
          ...today,
          gaps: [{ from: 1_700_000_000, to: 1_700_010_000 }],
          coverage_note:
            'Cairn was not running for about 2 hour(s) of today, so anything you reached for then is not here. This is what Cairn saw, not everything that happened.',
        }}
      />,
    );

    expect(screen.getByText(/not everything that happened/i)).toBeInTheDocument();
  });

  it('an empty day is stated plainly, not celebrated', () => {
    render(<Reaches today={{ ...today, reaches: [] }} />);
    const text = (document.body.textContent ?? '').toLowerCase();

    expect(text).toContain('nothing here for today');
    expect(text).not.toMatch(/great|proud|perfect|clean day/);
  });

  it('explains plainly when the history cannot be opened', () => {
    render(
      <Reaches
        today={{
          ...today,
          sealed:
            'Your keychain is locked, so your history stays sealed until it is unlocked. Protection is unaffected, and Cairn keeps recording.',
        }}
      />,
    );

    expect(screen.getByText(/protection is unaffected/i)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CairnMark } from '../CairnMark';
import { Landscape } from '../Landscape';

describe('Landscape', () => {
  it('is hidden from assistive technology and silent', () => {
    render(<Landscape />);
    const scene = screen.getByTestId('landscape');
    expect(scene).toHaveAttribute('aria-hidden', 'true');
    expect(scene.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('holds a sky, three hills, a sun and a cairn of five stones', () => {
    render(<Landscape />);
    const scene = screen.getByTestId('landscape');
    expect(scene.querySelectorAll('[data-testid="sky"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="hill"]')).toHaveLength(3);
    expect(scene.querySelectorAll('[data-testid="sun"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="cairn"] [data-testid="stone"]')).toHaveLength(5);
  });

  it('draws no lock, shield or chain', () => {
    const { container } = render(<Landscape />);
    expect(container.innerHTML).not.toMatch(/lock|shield|chain/i);
  });
});

describe('CairnMark', () => {
  it('is inline SVG with an accessible name and five stones', () => {
    const { container } = render(<CairnMark />);
    const mark = screen.getByRole('img', { name: 'Cairn' });
    expect(mark.tagName.toLowerCase()).toBe('svg');
    expect(container.querySelectorAll('[data-testid="stone"]')).toHaveLength(5);
    expect(container.innerHTML).not.toMatch(/lock|shield|chain/i);
  });
});

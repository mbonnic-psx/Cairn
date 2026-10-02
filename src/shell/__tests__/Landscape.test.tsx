import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CairnMark } from '../CairnMark';
import { Landscape } from '../Landscape';

describe('Landscape', () => {
  it('is hidden from assistive technology and silent', () => {
    render(<Landscape look="morning" />);
    const scene = screen.getByTestId('landscape');
    expect(scene).toHaveAttribute('aria-hidden', 'true');
    expect(scene.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('holds a sky, three hills, a sun and a cairn of five stones', () => {
    render(<Landscape look="morning" />);
    const scene = screen.getByTestId('landscape');
    expect(scene.querySelectorAll('[data-testid="sky"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="hill"]')).toHaveLength(3);
    expect(scene.querySelectorAll('[data-testid="sun"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="cairn"] [data-testid="stone"]')).toHaveLength(5);
  });

  it('draws no lock, shield or chain', () => {
    const { container } = render(<Landscape look="morning" />);
    expect(container.innerHTML).not.toMatch(/lock|shield|chain/i);
  });
});

describe('Landscape by look', () => {
  it.each(['morning', 'midday'] as const)('%s has a sun and no moon or stars', (look) => {
    render(<Landscape look={look} />);
    const scene = screen.getByTestId('landscape');
    expect(scene.querySelectorAll('[data-testid="sun"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="moon"]')).toHaveLength(0);
    expect(scene.querySelectorAll('[data-testid="star"]')).toHaveLength(0);
  });

  it('night has a moon and six stars and no sun', () => {
    render(<Landscape look="night" />);
    const scene = screen.getByTestId('landscape');
    expect(scene.querySelectorAll('[data-testid="moon"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="star"]')).toHaveLength(6);
    expect(scene.querySelectorAll('[data-testid="sun"]')).toHaveLength(0);
  });

  it.each(['morning', 'midday', 'night'] as const)('%s is hidden, whole, and carries no count or badge', (look) => {
    const { container } = render(<Landscape look={look} />);
    const scene = screen.getByTestId('landscape');
    expect(scene).toHaveAttribute('aria-hidden', 'true');
    expect(scene.querySelectorAll('[data-testid="sky"]')).toHaveLength(1);
    expect(scene.querySelectorAll('[data-testid="hill"]')).toHaveLength(3);
    expect(scene.querySelectorAll('[data-testid="cairn"] [data-testid="stone"]')).toHaveLength(5);
    expect(container.innerHTML).not.toMatch(/lock|shield|chain/i);
    expect(scene.textContent).toBe('');
    expect(scene.querySelectorAll('[data-count], [data-badge], [data-streak]')).toHaveLength(0);
  });
});

describe('Landscape night sky', () => {
  it('places the moon and every star by stylesheet token, never by an inline style', () => {
    render(<Landscape look="night" />);
    const scene = screen.getByTestId('landscape');
    for (const el of scene.querySelectorAll<HTMLElement>('[data-testid="moon"], [data-testid="star"]')) {
      expect(el.getAttribute('style')).toBeNull();
    }
  });
});

describe('CairnMark', () => {
  it('is inline SVG, decorative to assistive tech, with five stones', () => {
    const { container } = render(<CairnMark />);
    const mark = container.querySelector('svg')!;
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelectorAll('[data-testid="stone"]')).toHaveLength(5);
    expect(container.innerHTML).not.toMatch(/lock|shield|chain/i);
  });
});

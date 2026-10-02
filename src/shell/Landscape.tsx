/**
 * The scenery behind the notebook: sky, sun (moon and six stars at night), three hills and a cairn of five
 * stones. Decoration only: hidden from assistive technology, no controls, no
 * motion of its own. Every colour comes from a token in notebook.css.
 */
import type { NotebookLook } from '../look/look';

const STARS = [1, 2, 3, 4, 5, 6] as const;
const STONES = ['base', 'moss', 'amber', 'pale', 'base'] as const;

export function Landscape({ look }: { look: NotebookLook }) {
  const night = look === 'night';
  return (
    <div className="nb-landscape" data-testid="landscape" aria-hidden="true">
      <div className="nb-sky" data-testid="sky" />
      {night ? (
        <>
          <div className="nb-moon" data-testid="moon" />
          {STARS.map((n) => (
            <div key={n} className={`nb-star nb-star--${n}`} data-testid="star" />
          ))}
        </>
      ) : (
        <div className="nb-sun" data-testid="sun" />
      )}
      <div className="nb-hill nb-hill--far" data-testid="hill" />
      <div className="nb-hill nb-hill--mid" data-testid="hill" />
      <div className="nb-hill nb-hill--near" data-testid="hill" />
      <div className="nb-cairn" data-testid="cairn">
        {[...STONES].reverse().map((tone, i) => (
          <div key={i} className={`nb-stone nb-stone--${tone} nb-stone--${i + 1}`} data-testid="stone" />
        ))}
      </div>
    </div>
  );
}

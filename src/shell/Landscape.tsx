/**
 * The scenery behind the notebook: sky, sun, three hills and a cairn of five
 * stones. Decoration only: hidden from assistive technology, no controls, no
 * motion of its own. Every colour comes from a token in notebook.css.
 */
const STONES = ['base', 'moss', 'amber', 'pale', 'base'] as const;

export function Landscape() {
  return (
    <div className="nb-landscape" data-testid="landscape" aria-hidden="true">
      <div className="nb-sky" data-testid="sky" />
      <div className="nb-sun" data-testid="sun" />
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

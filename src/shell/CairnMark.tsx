/** The five-stone cairn, as the mark of the notebook. Inline, so it needs no file.
 * Decorative: the word "Cairn" beside it is the name a reader hears. */
const STONES = [
  { x: 590, y: 236, w: 196, h: 44, fill: 'var(--nb-stone-base)' },
  { x: 616, y: 184, w: 152, h: 44, fill: 'var(--nb-stone-moss)' },
  { x: 640, y: 136, w: 112, h: 40, fill: 'var(--nb-stone-amber)' },
  { x: 664, y: 94, w: 68, h: 34, fill: 'var(--nb-stone-pale)' },
  { x: 680, y: 60, w: 40, h: 26, fill: 'var(--nb-stone-base)' },
];

export function CairnMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="nb-mark"
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="570 40 236 260"
    >
      {STONES.map((s) => (
        <rect
          key={s.y}
          data-testid="stone"
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          rx={s.h / 2}
          style={{ fill: s.fill }}
        />
      ))}
    </svg>
  );
}

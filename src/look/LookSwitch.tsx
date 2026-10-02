/**
 * A testing aid: lets whoever is building Cairn wear another look. It is
 * rendered only in a development build (App decides) and keeps nothing.
 */
import type { Look } from './look';

const CHOICES: { value: Look; name: string }[] = [
  { value: 'morning', name: 'Morning' },
  { value: 'midday', name: 'Midday' },
  { value: 'night', name: 'Night' },
];

export function LookSwitch({
  look,
  onChange,
}: {
  look: Look;
  onChange: (look: Look) => void;
}) {
  return (
    <label
      className="nb-switch"
      data-look={look}
      style={{
        position: 'fixed',
        top: 8,
        right: 12,
        zIndex: 50,
        fontSize: 11,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}
    >
      <span>Look (testing)</span>
      <select
        value={look}
        style={{ fontSize: 11 }}
        onChange={(event) => onChange(event.target.value as Look)}
      >
        {CHOICES.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.name}
          </option>
        ))}
      </select>
    </label>
  );
}

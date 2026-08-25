import type { ButtonHTMLAttributes } from 'react';

type Tone = 'primary' | 'quiet';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
}

/** Nothing here shouts. The primary action is warm clay, not a signal colour. */
export function Button({ tone = 'primary', className = '', ...rest }: Props) {
  const tones: Record<Tone, string> = {
    primary:
      'bg-clay-600 text-sand-50 hover:bg-clay-500 disabled:bg-sand-300 disabled:text-ink-400',
    quiet: 'bg-transparent text-ink-500 hover:text-ink-900 hover:bg-sand-100',
  };

  return (
    <button
      {...rest}
      className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed ${tones[tone]} ${className}`}
    />
  );
}

import type { ReactNode } from 'react';

/** A quiet container. Generous padding, soft edge, no shadow theatre. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`settle rounded-2xl border border-sand-200 bg-white/60 p-8 ${className}`}
    >
      {children}
    </section>
  );
}

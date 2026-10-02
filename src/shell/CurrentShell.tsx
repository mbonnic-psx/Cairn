/**
 * Today's interface: the header, then one column. Rendered from the tabs it is
 * given, so the rules for which tabs exist live in one place (`tabsFor`).
 */
import type { ReactNode } from 'react';

import { Button } from '../components/Button';
import type { Tab, TabId } from '../navigation';

export function CurrentShell({
  tabs,
  onSelect,
  children,
}: {
  tabs: Tab[];
  onSelect: (id: TabId) => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <header className="mx-auto mb-10 flex max-w-3xl items-baseline justify-between">
        <h1 className="reflective text-2xl text-ink-900">Cairn</h1>
        {/* Deliberate navigation, and nothing here that draws someone to a
            destination: no count, no badge, no hint that there is something
            new to look at (FR-030a, FR-030b, FR-033). Only Protection is
            marked as the current page, as it always has been. */}
        <nav className="flex gap-1 text-sm">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              tone="quiet"
              aria-current={tab.id === 'protection' && tab.current ? 'page' : undefined}
              className={tab.id === 'protection' ? 'aria-[current=page]:text-ink-900' : undefined}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-6">{children}</div>
    </main>
  );
}

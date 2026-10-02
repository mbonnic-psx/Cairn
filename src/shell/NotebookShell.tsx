/**
 * The morning look: the window as a notebook in a landscape. It renders from
 * the tabs it is given (`tabsFor` decides which exist) and holds no data of
 * its own. The screen it wraps receives no new props.
 */
import type { ReactNode } from 'react';

import type { Tab, TabId } from '../navigation';
import { CairnMark } from './CairnMark';
import { Greeting } from './Greeting';
import { Landscape } from './Landscape';

export function NotebookShell({
  tabs,
  onSelect,
  children,
}: {
  tabs: Tab[];
  onSelect: (id: TabId) => void;
  children: ReactNode;
}) {
  return (
    <div className="nb-root" data-look="morning">
      <Landscape />
      <div className="nb-titlebar">
        <CairnMark />
        <span className="nb-titlebar__name">Cairn</span>
      </div>
      <aside className="nb-aside">
        <Greeting />
      </aside>
      <div className="nb-notebook nb-spread">
        <span className="nb-margin" aria-hidden="true" />
        <main className="nb-page-area nb-page">{children}</main>
        <nav className="nb-tabs" aria-label="Pages">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nb-tab nb-tab--${tab.id}`}
              aria-current={tab.current ? 'page' : undefined}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

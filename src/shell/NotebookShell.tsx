/**
 * The notebook looks (morning, midday, night): the window as a notebook in a landscape. It renders from
 * the tabs it is given (`tabsFor` decides which exist) and holds no data of
 * its own. The screen it wraps receives no new props.
 */
import type { ReactNode } from 'react';

import type { NotebookLook } from '../look/look';
import type { Tab, TabId } from '../navigation';
import { CairnMark } from './CairnMark';
import { Greeting } from './Greeting';
import { Landscape } from './Landscape';
import { NotebookPageContext } from './notebookPage';

export function NotebookShell({
  tabs,
  onSelect,
  look,
  children,
}: {
  tabs: Tab[];
  onSelect: (id: TabId) => void;
  look: NotebookLook;
  children: ReactNode;
}) {
  return (
    <div className="nb-root" data-look={look}>
      <Landscape look={look} />
      <div className="nb-titlebar">
        <CairnMark />
        <span className="nb-titlebar__name">Cairn</span>
      </div>
      <aside className="nb-aside">
        <Greeting look={look} />
      </aside>
      <div className="nb-notebook nb-spread">
        <span className="nb-margin" aria-hidden="true" />
        <main className="nb-page-area nb-page">
          <NotebookPageContext.Provider value={true}>{children}</NotebookPageContext.Provider>
        </main>
        <nav className="nb-tabs" aria-label="Pages">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nb-tab nb-tab--${tab.id}`}
              aria-current={tab.current ? 'page' : undefined}
              onClick={() => onSelect(tab.id)}
            >
              <span className="nb-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

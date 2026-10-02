/**
 * The notebook looks (morning, midday, night): the window as a notebook in a landscape. It renders from
 * the tabs it is given (`tabsFor` decides which exist) and holds no data of
 * its own. The screen it wraps receives no new props.
 */
import { useEffect, useRef, type ReactNode } from 'react';

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
  page,
  children,
}: {
  tabs: Tab[];
  onSelect: (id: TabId) => void;
  look: NotebookLook;
  /** Which screen is open, where one tab holds several (choosing and its disclosure); the current tab otherwise. */
  page?: string;
  children: ReactNode;
}) {
  // The page area scrolls, and on a spread with no control nothing else in it takes focus: it is a tab stop
  // of its own so the keyboard can scroll it in every webview (D19). A new screen opens at its top.
  const pageArea = useRef<HTMLElement>(null);
  const opened = page ?? tabs.find((tab) => tab.current)?.id;
  useEffect(() => {
    if (pageArea.current) pageArea.current.scrollTop = 0;
  }, [opened]);
  return (
    <div className="nb-root" data-look={look}>
      <h1 className="sr-only">Cairn</h1>
      <Landscape look={look} />
      <div className="nb-titlebar">
        <CairnMark />
        <span className="nb-titlebar__name" aria-hidden="true">Cairn</span>
      </div>
      <aside className="nb-aside">
        <Greeting look={look} />
      </aside>
      <div className="nb-notebook nb-spread">
        <span className="nb-margin" aria-hidden="true" />
        <span className="nb-fold" aria-hidden="true" />
        <main ref={pageArea} className="nb-page-area nb-page" tabIndex={0}>
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

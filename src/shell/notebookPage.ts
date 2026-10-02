/**
 * Whether a screen is on a notebook page. `NotebookShell` says so through this context; `CurrentShell`
 * and a screen rendered outside any shell say nothing, so they read `false` and render as they always have.
 */
import { createContext, useContext } from 'react';

export const NotebookPageContext = createContext<boolean>(false);

export function useNotebookPage(): boolean {
  return useContext(NotebookPageContext);
}

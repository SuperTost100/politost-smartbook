import { createContext, useContext } from 'react';

export interface IndexDrawer {
  /** Opens the index drawer; unset when the index sits in the side panel or the page has none. */
  open?: () => void;
  expanded: boolean;
}

export const IndexDrawerContext = createContext<IndexDrawer>({ expanded: false });

/** Lets a page offer its own control for the index drawer, next to the menu button in the top bar. */
export function useIndexDrawer(): IndexDrawer {
  return useContext(IndexDrawerContext);
}

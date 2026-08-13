"use client";

import { create } from "zustand";
import type { SearchResult } from "@/types/searchResult";

interface PendingSearch {
  value: string;
  type: string;
}

interface SearchState {
  /** The most recent search result (set after zoom completes). */
  lastResult: SearchResult | null;

  /** A pending search request (e.g. from a URL parameter shortcut). */
  pendingSearch: PendingSearch | null;

  /** Set the last search result. Called by SearchZoom after zooming. */
  setLastResult: (result: SearchResult | null) => void;

  /** Clear the last search result. */
  clearLastResult: () => void;

  /** Request a search to be performed by the Search component. */
  setPendingSearch: (search: PendingSearch | null) => void;

  /** Clear the pending search after it has been consumed. */
  clearPendingSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  lastResult: null,
  pendingSearch: null,

  setLastResult: (result) => set({ lastResult: result }),

  clearLastResult: () => set({ lastResult: null }),

  setPendingSearch: (search) => set({ pendingSearch: search }),

  clearPendingSearch: () => set({ pendingSearch: null }),
}));

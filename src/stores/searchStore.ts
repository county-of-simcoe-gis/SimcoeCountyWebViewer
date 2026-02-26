"use client";

import { create } from "zustand";
import type { SearchResult } from "@/interfaces/searchResult";

interface SearchState {
  /** The most recent search result (set after zoom completes). */
  lastResult: SearchResult | null;

  /** Set the last search result. Called by SearchZoom after zooming. */
  setLastResult: (result: SearchResult | null) => void;

  /** Clear the last search result. */
  clearLastResult: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  lastResult: null,

  setLastResult: (result) => set({ lastResult: result }),

  clearLastResult: () => set({ lastResult: null }),
}));

import { create } from "zustand";
import React from "react";

export interface ReportContent {
  id: string;
  title: string;
  content: React.ReactNode;
  createdAt: Date;
  /** Discriminator indicating the origin of this report (e.g. "popupPopOut"). */
  source?: string;
}

interface ReportsState {
  // Current report being displayed
  currentReport: ReportContent | null;

  // Browser-style navigation stack (session only)
  historyStack: ReportContent[];
  historyIndex: number;

  // Derived navigation flags
  canGoBack: boolean;
  canGoForward: boolean;

  // Actions
  setReport: (report: ReportContent) => void;
  clearReport: () => void;
  clearAllReports: () => void;
  goBack: () => void;
  goForward: () => void;
  getReportById: (id: string) => ReportContent | null;
}

/** Recompute the derived navigation flags from stack + index. */
function deriveNavFlags(stack: ReportContent[], index: number) {
  return {
    canGoBack: index > 0,
    canGoForward: index < stack.length - 1,
  };
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Initial state
  currentReport: null,
  historyStack: [],
  historyIndex: -1,
  canGoBack: false,
  canGoForward: false,

  // Set current report — pushes onto the navigation stack (trims forward history)
  setReport: (report) => {
    set((state) => {
      // Trim any forward history beyond the current position
      const trimmedStack = state.historyStack.slice(0, state.historyIndex + 1);
      const newStack = [...trimmedStack, report];
      const newIndex = newStack.length - 1;
      return {
        currentReport: report,
        historyStack: newStack,
        historyIndex: newIndex,
        ...deriveNavFlags(newStack, newIndex),
      };
    });
  },

  // Clear current report (doesn't erase history — user can still go back)
  clearReport: () => {
    set({ currentReport: null });
  },

  // Clear everything
  clearAllReports: () => {
    set({
      currentReport: null,
      historyStack: [],
      historyIndex: -1,
      canGoBack: false,
      canGoForward: false,
    });
  },

  // Navigate back in history
  goBack: () => {
    set((state) => {
      if (state.historyIndex <= 0) return {};
      const newIndex = state.historyIndex - 1;
      return {
        currentReport: state.historyStack[newIndex],
        historyIndex: newIndex,
        ...deriveNavFlags(state.historyStack, newIndex),
      };
    });
  },

  // Navigate forward in history
  goForward: () => {
    set((state) => {
      if (state.historyIndex >= state.historyStack.length - 1) return {};
      const newIndex = state.historyIndex + 1;
      return {
        currentReport: state.historyStack[newIndex],
        historyIndex: newIndex,
        ...deriveNavFlags(state.historyStack, newIndex),
      };
    });
  },

  // Get report by ID from history
  getReportById: (id) => {
    const state = get();
    return state.historyStack.find((r) => r.id === id) || null;
  },
}));

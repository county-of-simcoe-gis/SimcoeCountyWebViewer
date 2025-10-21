import { create } from "zustand";
import React from "react";

export interface ReportContent {
  id: string;
  title: string;
  content: React.ReactNode;
  createdAt: Date;
}

interface ReportsState {
  // Current report being displayed
  currentReport: ReportContent | null;

  // Report history
  reportHistory: ReportContent[];

  // Actions
  setReport: (report: ReportContent) => void;
  clearReport: () => void;
  clearAllReports: () => void;
  getReportById: (id: string) => ReportContent | null;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Initial state
  currentReport: null,
  reportHistory: [],

  // Set current report and add to history
  setReport: (report) => {
    set((state) => ({
      currentReport: report,
      reportHistory: [report, ...state.reportHistory].slice(0, 10), // Keep last 10 reports
    }));
  },

  // Clear current report
  clearReport: () => {
    set({ currentReport: null });
  },

  // Clear all reports
  clearAllReports: () => {
    set({
      currentReport: null,
      reportHistory: [],
    });
  },

  // Get report by ID from history
  getReportById: (id) => {
    const state = get();
    return state.reportHistory.find((r) => r.id === id) || null;
  },
}));

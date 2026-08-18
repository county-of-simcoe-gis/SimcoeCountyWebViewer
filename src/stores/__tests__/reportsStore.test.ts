import { describe, it, expect, beforeEach } from "vitest";
import { useReportsStore, ReportContent } from "@/stores/reportsStore";
import React from "react";

function makeReport(id: string, title = `Report ${id}`): ReportContent {
  return { id, title, content: React.createElement("div", null, title), createdAt: new Date() };
}

describe("reportsStore", () => {
  beforeEach(() => {
    useReportsStore.getState().clearAllReports();
  });

  it("starts with no report and empty history", () => {
    const s = useReportsStore.getState();
    expect(s.currentReport).toBeNull();
    expect(s.historyStack).toEqual([]);
    expect(s.historyIndex).toBe(-1);
    expect(s.canGoBack).toBe(false);
    expect(s.canGoForward).toBe(false);
  });

  it("setReport pushes onto history and becomes current", () => {
    const r = makeReport("1");
    useReportsStore.getState().setReport(r);
    const s = useReportsStore.getState();
    expect(s.currentReport?.id).toBe("1");
    expect(s.historyStack).toHaveLength(1);
    expect(s.historyIndex).toBe(0);
    expect(s.canGoBack).toBe(false);
    expect(s.canGoForward).toBe(false);
  });

  it("pushing multiple reports builds history stack", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().setReport(makeReport("2"));
    useReportsStore.getState().setReport(makeReport("3"));
    const s = useReportsStore.getState();
    expect(s.historyStack).toHaveLength(3);
    expect(s.historyIndex).toBe(2);
    expect(s.currentReport?.id).toBe("3");
    expect(s.canGoBack).toBe(true);
    expect(s.canGoForward).toBe(false);
  });

  it("goBack navigates to previous report", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().setReport(makeReport("2"));
    useReportsStore.getState().goBack();
    const s = useReportsStore.getState();
    expect(s.currentReport?.id).toBe("1");
    expect(s.historyIndex).toBe(0);
    expect(s.canGoBack).toBe(false);
    expect(s.canGoForward).toBe(true);
  });

  it("goForward navigates to next report", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().setReport(makeReport("2"));
    useReportsStore.getState().goBack();
    useReportsStore.getState().goForward();
    const s = useReportsStore.getState();
    expect(s.currentReport?.id).toBe("2");
    expect(s.canGoForward).toBe(false);
  });

  it("goBack at beginning is a no-op", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().goBack();
    expect(useReportsStore.getState().currentReport?.id).toBe("1");
  });

  it("goForward at end is a no-op", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().goForward();
    expect(useReportsStore.getState().currentReport?.id).toBe("1");
  });

  it("setReport after goBack trims forward history", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().setReport(makeReport("2"));
    useReportsStore.getState().setReport(makeReport("3"));
    useReportsStore.getState().goBack();
    useReportsStore.getState().goBack();
    // Now at index 0 (report "1"), push new report
    useReportsStore.getState().setReport(makeReport("4"));
    const s = useReportsStore.getState();
    expect(s.historyStack).toHaveLength(2);
    expect(s.historyStack[0].id).toBe("1");
    expect(s.historyStack[1].id).toBe("4");
    expect(s.canGoForward).toBe(false);
  });

  it("clearReport clears current but keeps history", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().clearReport();
    const s = useReportsStore.getState();
    expect(s.currentReport).toBeNull();
    expect(s.historyStack).toHaveLength(1);
  });

  it("clearAllReports resets everything", () => {
    useReportsStore.getState().setReport(makeReport("1"));
    useReportsStore.getState().setReport(makeReport("2"));
    useReportsStore.getState().clearAllReports();
    const s = useReportsStore.getState();
    expect(s.currentReport).toBeNull();
    expect(s.historyStack).toEqual([]);
    expect(s.historyIndex).toBe(-1);
  });

  it("getReportById finds report in history", () => {
    useReportsStore.getState().setReport(makeReport("abc"));
    expect(useReportsStore.getState().getReportById("abc")?.id).toBe("abc");
  });

  it("getReportById returns null for non-existent id", () => {
    expect(useReportsStore.getState().getReportById("nope")).toBeNull();
  });
});

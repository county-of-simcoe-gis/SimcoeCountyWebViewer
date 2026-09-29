"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useReportsStore } from "@/stores/reportsStore";
import { usePopupStore } from "@/stores/popupStore";

/**
 * Navigation bar rendered at the top of the Reports tab.
 * - Back / Forward buttons to navigate the report history stack.
 * - "Always display popup info in Reports tab" toggle (visible only
 *   when the current report came from a popup pop-out).
 */
export default function ReportsNavBar() {
  const canGoBack = useReportsStore((s) => s.canGoBack);
  const canGoForward = useReportsStore((s) => s.canGoForward);
  const goBack = useReportsStore((s) => s.goBack);
  const goForward = useReportsStore((s) => s.goForward);
  const currentReport = useReportsStore((s) => s.currentReport);
  const alwaysUseReportsTab = usePopupStore((s) => s.alwaysUseReportsTab);
  const setAlwaysUseReportsTab = usePopupStore((s) => s.setAlwaysUseReportsTab);

  const showToggle = currentReport?.source === "popupPopOut" || currentReport?.source === "propertyReport";

  return (
    <div className="flex items-center justify-between py-1.5 px-2 bg-base-200 border-b border-base-300 gap-2 min-h-[36px]">
      {/* Back / Forward */}
      <div className="flex items-center gap-1">
        <button
          className="bg-base-100 border border-base-300 rounded px-1.5 py-1 cursor-pointer flex items-center justify-center transition-all text-base-content hover:enabled:bg-base-300 hover:enabled:border-base-content/30 disabled:opacity-35 disabled:cursor-default"
          disabled={!canGoBack}
          onClick={goBack}
          aria-label="Go back"
          title="Go back"
        >
          <FaChevronLeft size={12} />
        </button>
        <button
          className="bg-base-100 border border-base-300 rounded px-1.5 py-1 cursor-pointer flex items-center justify-center transition-all text-base-content hover:enabled:bg-base-300 hover:enabled:border-base-content/30 disabled:opacity-35 disabled:cursor-default"
          disabled={!canGoForward}
          onClick={goForward}
          aria-label="Go forward"
          title="Go forward"
        >
          <FaChevronRight size={12} />
        </button>
      </div>

      {/* "Always display" toggle — only for popup-originated content */}
      {showToggle && (
        <div className="flex items-center gap-1.5 text-[11px] text-base-content/70 whitespace-nowrap">
          <label htmlFor="sc-always-reports-toggle" className="cursor-pointer select-none">
            Always display popup info in Reports tab
          </label>
          <input id="sc-always-reports-toggle" type="checkbox" className="toggle toggle-sm toggle-primary" checked={alwaysUseReportsTab} onChange={(e) => setAlwaysUseReportsTab(e.target.checked)} />
        </div>
      )}
    </div>
  );
}

"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useReportsStore } from "@/stores/reportsStore";
import { usePopupStore } from "@/stores/popupStore";
import "./ReportsNavBar.css";

/**
 * Navigation bar rendered at the top of the Reports tab.
 * - Back / Forward buttons to navigate the report history stack.
 * - "Always display popup info in Reports tab" toggle (visible only
 *   when the current report came from a popup pop-out).
 */
export default function ReportsNavBar() {
  const { canGoBack, canGoForward, goBack, goForward, currentReport } = useReportsStore();
  const { alwaysUseReportsTab, setAlwaysUseReportsTab } = usePopupStore();

  const showToggle = currentReport?.source === "popupPopOut" || currentReport?.source === "propertyReport";

  return (
    <div className="sc-reports-navbar">
      {/* Back / Forward */}
      <div className="sc-reports-navbar-nav">
        <button className="sc-reports-navbar-btn" disabled={!canGoBack} onClick={goBack} aria-label="Go back" title="Go back">
          <FaChevronLeft size={12} />
        </button>
        <button className="sc-reports-navbar-btn" disabled={!canGoForward} onClick={goForward} aria-label="Go forward" title="Go forward">
          <FaChevronRight size={12} />
        </button>
      </div>

      {/* "Always display" toggle — only for popup-originated content */}
      {showToggle && (
        <div className="sc-reports-navbar-toggle">
          <label htmlFor="sc-always-reports-toggle">Always display popup info in Reports tab</label>
          <input id="sc-always-reports-toggle" type="checkbox" className="toggle toggle-sm toggle-primary" checked={alwaysUseReportsTab} onChange={(e) => setAlwaysUseReportsTab(e.target.checked)} />
        </div>
      )}
    </div>
  );
}

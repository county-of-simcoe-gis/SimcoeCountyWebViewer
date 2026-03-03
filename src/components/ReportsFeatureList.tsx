"use client";

import { useState, type ReactNode } from "react";
import { FaHome, FaBuilding, FaLayerGroup, FaChevronDown, FaChevronRight } from "react-icons/fa";
import type { Result, PropertyResult, CondoResult, IdentifyResult } from "@/components/ResultsPopup";
import PropertyPopup from "@/components/PropertyPopup";
import { InfoRow } from "@/components/common/InfoRow";
import "./ReportsFeatureList.css";

interface ReportsFeatureListProps {
  results: Result[];
  onClose?: () => void;
  onClearParcelLayer?: () => void;
}

/** Icon for a given result type. */
function ResultIcon({ result }: { result: Result }) {
  switch (result.type) {
    case "property":
      return <FaHome className="sc-rfl-icon-svg" />;
    case "condo":
      return <FaBuilding className="sc-rfl-icon-svg" />;
    case "identify":
    case "layer":
      return <FaLayerGroup className="sc-rfl-icon-svg" />;
  }
}

/** Summary line shown in the collapsed panel header. */
function panelTitle(result: Result): string {
  switch (result.type) {
    case "property":
      return (result as PropertyResult).data.Address || result.displayName;
    case "condo":
      return result.displayName;
    case "identify":
    case "layer":
      return `${(result as IdentifyResult).data.layerName}: ${result.displayName}`;
  }
}

/** Subtitle / type badge text. */
function panelSubtitle(result: Result): string {
  switch (result.type) {
    case "property":
      return "Property";
    case "condo":
      return "Condo Unit";
    case "identify":
    case "layer":
      return (result as IdentifyResult).data.layerName;
  }
}

/** Render the full expanded content for one result. */
function FeatureContent({ result, onClose, onClearParcelLayer }: { result: Result; onClose?: () => void; onClearParcelLayer?: () => void }): ReactNode {
  // Use custom renderContent callback if the result provides one (e.g. 511 cameras, live layers).
  // This ensures the Reports tab shows the same content as the map popup.
  if (result.renderContent) {
    return result.renderContent();
  }

  switch (result.type) {
    case "property":
    case "condo": {
      const r = result as PropertyResult | CondoResult;
      if (r.data.propInfo && r.data.feature) {
        return <PropertyPopup propInfo={r.data.propInfo} feature={r.data.feature} onClose={onClose} onClearParcelLayer={onClearParcelLayer} />;
      }
      return <div className="sc-rfl-empty">Loading property details…</div>;
    }
    case "identify":
    case "layer": {
      const r = result as IdentifyResult;
      return (
        <div className="sc-rfl-identify-content">
          <p className="sc-rfl-feature-id">Feature ID: {r.data.featureId}</p>
          <div className="sc-rfl-attributes">
            {Object.entries(r.data.attributes)
              .filter(([key, value]) => key !== "geometry" && key !== "bbox" && !key.startsWith("_") && typeof value !== "object")
              .map(([key, value]) => (
                <InfoRow key={key} label={key} value={value != null ? String(value) : ""} />
              ))}
          </div>
        </div>
      );
    }
    default:
      return <div className="sc-rfl-empty">No details available for this result.</div>;
  }
}

/**
 * Renders a list of map-click results inside the Reports sidebar tab.
 *
 * - 1 result  → renders its content directly (no accordion).
 * - N results → header with count + collapsible panels per feature.
 */
export default function ReportsFeatureList({ results, onClose, onClearParcelLayer }: ReportsFeatureListProps) {
  // Track which panels are expanded (by result id)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand the first result
    if (results.length > 0) return new Set([results[0].id]);
    return new Set();
  });

  if (results.length === 0) return null;

  // Single result — render directly without accordion chrome
  if (results.length === 1) {
    return (
      <div className="sc-rfl-container">
        <FeatureContent result={results[0]} onClose={onClose} onClearParcelLayer={onClearParcelLayer} />
      </div>
    );
  }

  const togglePanel = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="sc-rfl-container">
      {/* Collapsible panels */}
      <div className="sc-rfl-panels">
        {results.map((result) => {
          const isExpanded = expandedIds.has(result.id);

          return (
            <div key={result.id} className={`sc-rfl-panel ${isExpanded ? "sc-rfl-panel-expanded" : ""}`}>
              {/* Panel header — clickable */}
              <button className="sc-rfl-panel-header" onClick={() => togglePanel(result.id)} aria-expanded={isExpanded}>
                <span className="sc-rfl-panel-chevron">{isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}</span>
                <span className="sc-rfl-panel-icon">
                  <ResultIcon result={result} />
                </span>
                <span className="sc-rfl-panel-title-group">
                  <span className="sc-rfl-panel-title">{panelTitle(result)}</span>
                  <span className="sc-rfl-panel-subtitle">{panelSubtitle(result)}</span>
                </span>
              </button>

              {/* Panel body — expanded content */}
              {isExpanded && (
                <div className="sc-rfl-panel-body">
                  <FeatureContent result={result} onClose={onClose} onClearParcelLayer={onClearParcelLayer} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, type ReactNode } from "react";
import { FaHome, FaBuilding, FaLayerGroup, FaChevronDown, FaChevronRight } from "react-icons/fa";
import type { Result, PropertyResult, CondoResult, IdentifyResult } from "@/components/ResultsPopup";
import PropertyPopup from "@/components/PropertyPopup";
import { InfoRow } from "@/components/common/InfoRow";
import { isExcludedKey } from "@/utils/identifyHelpers";
import { useFeatureHighlight } from "@/hooks/useFeatureHighlight";

interface ReportsFeatureListProps {
  results: Result[];
  onClose?: () => void;
  onClearParcelLayer?: () => void;
}

/** Icon for a given result type. */
function ResultIcon({ result }: { result: Result }) {
  switch (result.type) {
    case "property":
      return <FaHome className="text-xs" />;
    case "condo":
      return <FaBuilding className="text-xs" />;
    case "identify":
    case "layer":
      return <FaLayerGroup className="text-xs" />;
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
      return <div className="p-3 text-[13px] text-[#999]">Loading property details…</div>;
    }
    case "identify":
    case "layer": {
      const r = result as IdentifyResult;
      return (
        <div className="py-2.5 px-3">
          <div className="flex flex-col">
            {Object.entries(r.data.attributes)
              .filter(([key, value]) => !isExcludedKey(key) && key !== "bbox" && typeof value !== "object")
              .map(([key, value]) => (
                <InfoRow key={key} label={key} value={value != null ? String(value) : ""} />
              ))}
          </div>
        </div>
      );
    }
    default:
      return <div className="p-3 text-[13px] text-[#999]">No details available for this result.</div>;
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
  const { highlightFeature, clearHighlight } = useFeatureHighlight();

  const handleMouseEnter = useCallback(
    (result: Result) => {
      const feature = result.data?.feature;
      if (feature) {
        highlightFeature(feature);
      }
    },
    [highlightFeature],
  );

  const handleMouseLeave = useCallback(() => {
    clearHighlight();
  }, [clearHighlight]);

  if (results.length === 0) return null;

  // Single result — render directly without accordion chrome
  if (results.length === 1) {
    return (
      <div className="w-full" onMouseEnter={() => handleMouseEnter(results[0])} onMouseLeave={handleMouseLeave}>
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
    <div className="w-full">
      {/* Collapsible panels */}
      <div className="flex flex-col">
        {results.map((result) => {
          const isExpanded = expandedIds.has(result.id);

          return (
            <div key={result.id} className={`border-b border-[#e5e5e5] last:border-b-0 ${isExpanded ? "expanded" : ""}`}>
              {/* Panel header — clickable */}
              <button
                className={`flex items-center gap-2 w-full py-2.5 px-3 border-none cursor-pointer text-left text-[13px] transition-colors ${isExpanded ? "bg-[#e8f0fe] border-b border-[#d4e4f7]" : "bg-[#fafafa] hover:bg-[#f0f0f0]"}`}
                onClick={() => togglePanel(result.id)}
                onMouseEnter={() => handleMouseEnter(result)}
                onMouseLeave={handleMouseLeave}
                aria-expanded={isExpanded}
              >
                <span className="shrink-0 text-[#888] flex items-center">{isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}</span>
                <span className={`shrink-0 flex items-center justify-center w-[26px] h-[26px] rounded-full ${isExpanded ? "bg-[#1976d2] text-white" : "bg-[#e0e0e0] text-[#555]"}`}>
                  <ResultIcon result={result} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-semibold text-[#333] whitespace-nowrap overflow-hidden text-ellipsis">{panelTitle(result)}</span>
                  <span className="text-[11px] text-[#888] mt-px">{panelSubtitle(result)}</span>
                </span>
              </button>

              {/* Panel body — expanded content */}
              {isExpanded && (
                <div className="bg-white">
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

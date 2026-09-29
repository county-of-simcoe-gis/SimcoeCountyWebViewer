"use client";

import React, { useState, useMemo } from "react";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import { useMapStore } from "@/stores/mapStore";
import { FaChevronDown, FaChevronRight, FaSearchPlus } from "react-icons/fa";
import { toTitleCase } from "@/utils/helpersString";
import { isExcludedKey } from "@/utils/identifyHelpers";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeatureSection {
  /** Section heading (e.g. layer / category title) */
  title: string;
  /** OpenLayers features returned by the query */
  features: Feature<Geometry>[];
  /** Property name used as the display label for each feature */
  featureTitleColumn: string;
}

interface SpatialQueryResultsProps {
  /** Grouped feature sections to render */
  sections: FeatureSection[];
  /** VectorSource used for hover-highlight; caller owns the layer lifecycle */
  highlightSource: VectorSource | null;
  /** Message shown when there are no sections / no results from any query */
  emptyMessage?: string;
  /** When true, renders each property label above its value instead of inline */
  stackedLayout?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpatialQueryResults({ sections, highlightSource, emptyMessage = "No Results", stackedLayout = false }: SpatialQueryResultsProps) {
  const totalFeatures = useMemo(() => sections.reduce((sum, s) => sum + s.features.length, 0), [sections]);

  if (sections.length === 0 || totalFeatures === 0) {
    return <div className="p-4 text-center text-sm text-base-content/60">{emptyMessage}</div>;
  }

  return (
    <div className="flex flex-col divide-y divide-base-300">
      {sections.map((section, idx) => (
        <SectionPanel key={`${idx}-${section.title}`} section={section} highlightSource={highlightSource} stackedLayout={stackedLayout} />
      ))}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function SectionPanel({ section, highlightSource, stackedLayout }: { section: FeatureSection; highlightSource: VectorSource | null; stackedLayout: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      {/* Section header – only shown when there are multiple sections */}
      <button type="button" className="flex w-full items-center gap-2 bg-base-200 px-3 py-2 text-sm font-semibold" onClick={() => setIsOpen((o) => !o)}>
        {isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
        <span className="flex-1 text-left">{section.title}</span>
        <span className="badge badge-sm">{section.features.length}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col">
          {section.features.length === 0 ? (
            <div className="p-3 text-sm text-base-content/60">No Results</div>
          ) : (
            section.features.map((feature, idx) => (
              <FeatureItem key={feature.getId()?.toString() ?? idx} feature={feature} featureTitleColumn={section.featureTitleColumn} highlightSource={highlightSource} stackedLayout={stackedLayout} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Feature Item ────────────────────────────────────────────────────────────

function FeatureItem({
  feature,
  featureTitleColumn,
  highlightSource,
  stackedLayout,
}: {
  feature: Feature<Geometry>;
  featureTitleColumn: string;
  highlightSource: VectorSource | null;
  stackedLayout: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const map = useMapStore((s) => s.map);
  const props = feature.getProperties();
  const title = props[featureTitleColumn] ?? "(untitled)";

  const handleMouseEnter = () => {
    const geom = feature.getGeometry();
    if (geom && highlightSource) {
      highlightSource.clear();
      highlightSource.addFeature(feature);
    }
  };

  const handleMouseLeave = () => {
    highlightSource?.clear();
  };

  const handleZoom = () => {
    const geom = feature.getGeometry();
    if (map && geom) {
      map.getView().fit(geom.getExtent(), { duration: 500, padding: [50, 50, 50, 50] });
    }
  };

  return (
    <div className="border-b border-base-300 hover:bg-base-200 transition-colors" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Header row */}
      <div className="flex items-center gap-1 px-3 py-2">
        <button type="button" className="flex-1 text-left text-sm text-primary cursor-pointer hover:underline truncate" onClick={() => setDetailsOpen((o) => !o)} title={String(title)}>
          {String(title)}
        </button>
        <button type="button" className="btn btn-xs btn-ghost btn-square" onClick={handleZoom} title="Zoom to feature">
          <FaSearchPlus size={12} />
        </button>
      </div>

      {/* Expandable detail */}
      {detailsOpen && (
        <div className="px-3 pb-3">
          {stackedLayout ? (
            <div className="flex flex-col gap-2 text-xs">
              {Object.entries(props)
                .filter(([key]) => !isExcludedKey(key) && key !== featureTitleColumn)
                .map(([key, value]) => (
                  <div key={key}>
                    <div className="font-semibold text-base-content/70">{toTitleCase(key)}</div>
                    <div className="break-words">{value != null ? String(value) : ""}</div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {Object.entries(props)
                .filter(([key]) => !isExcludedKey(key) && key !== featureTitleColumn)
                .map(([key, value]) => (
                  <React.Fragment key={key}>
                    <span className="font-semibold text-base-content/70 whitespace-nowrap">{toTitleCase(key)}</span>
                    <span className="break-words">{value != null ? String(value) : ""}</span>
                  </React.Fragment>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

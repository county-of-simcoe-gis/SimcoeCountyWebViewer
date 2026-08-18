"use client";

/**
 * AttributeTableTabs — layer tab strip shown at the top of the panel.
 */

import React from "react";
import { FaTimes } from "react-icons/fa";
import { useAttributeTableStore, type AttributeTableTab } from "@/stores/attributeTableStore";
import { clearHighlightsForLayer } from "@/lib/attributeTable/mapIntegration";

export default function AttributeTableTabs(): React.ReactElement {
  const tabs = useAttributeTableStore((s) => s.tabs);
  const activeId = useAttributeTableStore((s) => s.activeLayerId);
  const setActive = useAttributeTableStore((s) => s.setActive);
  const closeTab = useAttributeTableStore((s) => s.closeTab);

  return (
    <div className="flex items-stretch bg-base-200 border-b border-base-300 overflow-x-auto">
      {tabs.map((t: AttributeTableTab) => {
        const active = t.layerId === activeId;
        const countLabel = t.totalCount !== null ? `${t.loadedCount.toLocaleString()} / ${t.totalCount.toLocaleString()}` : t.loadedCount > 0 ? `${t.loadedCount.toLocaleString()}` : "";
        return (
          <div
            key={t.layerId}
            className={`group flex items-center gap-2 px-3 py-1.5 border-r border-base-300 cursor-pointer text-xs whitespace-nowrap ${active ? "bg-base-100 font-semibold border-b-2 border-b-primary" : "hover:bg-base-300"}`}
            onClick={() => setActive(t.layerId)}
            role="tab"
            aria-selected={active}
          >
            <span className="truncate max-w-[180px]" title={t.layerName}>
              {t.layerName}
            </span>
            {countLabel ? <span className="opacity-60">({countLabel})</span> : null}
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square ml-1 opacity-60 hover:opacity-100"
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                clearHighlightsForLayer(t.layerId);
                closeTab(t.layerId);
              }}
            >
              <FaTimes size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

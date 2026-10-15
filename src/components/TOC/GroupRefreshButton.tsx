"use client";

import React from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import { useTOCStore, type TOCLayer } from "@/stores/tocStore";
import { useLayerRefreshStore } from "@/stores/layerRefreshStore";
import { canRefreshLayer, startGroupRefresh, stopGroupRefresh } from "@/utils/openlayers/LayerRefresh";

interface GroupRefreshButtonProps {
  layers: TOCLayer[];
}

export default function GroupRefreshButton({ layers }: GroupRefreshButtonProps) {
  const allLayers = useTOCStore((s) => s.allLayers);
  const refreshableLayers = layers.filter(canRefreshLayer);
  const refreshableIds = refreshableLayers.map((layer) => layer.id);
  const anyPlaying = useLayerRefreshStore((s) => refreshableIds.some((id) => s.playing[id]));

  if (refreshableLayers.length === 0) return null;

  const visibleIds = new Set(allLayers.filter((layer) => layer.visible).map((layer) => layer.id));
  const startableLayers = refreshableLayers.filter((layer) => visibleIds.has(layer.id));
  const label = anyPlaying ? "Pause timed refresh for this group" : "Start timed refresh for this group";

  const onClick = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation();
    if (anyPlaying) {
      stopGroupRefresh(refreshableLayers);
    } else {
      startGroupRefresh(startableLayers);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs btn-square min-h-0 h-6 w-6 ml-1 shrink-0"
      title={label}
      aria-label={label}
      disabled={!anyPlaying && startableLayers.length === 0}
      onClick={onClick}
    >
      {anyPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
    </button>
  );
}

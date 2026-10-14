import React from "react";
import type { TOCLayer } from "@/stores/tocStore";
import { useLayerTimeStore } from "@/stores/layerTimeStore";
import { setTimeIndex, stopLayerRefresh } from "@/utils/openlayers/LayerRefresh";
import { formatTimeValue, getTimeCount, getTimeValueAt } from "@/utils/timeDimension";

interface LayerTimeSliderProps {
  layer: TOCLayer;
  onInteractionChange?: (active: boolean) => void;
}

export default function LayerTimeSlider({ layer, onInteractionChange }: LayerTimeSliderProps) {
  const storedIndex = useLayerTimeStore((state) => state.indexes[layer.id]);
  const timeDimension = layer.timeDimension;
  if (!timeDimension) return null;

  const currentIndex = storedIndex ?? timeDimension.defaultIndex;
  const currentValue = getTimeValueAt(timeDimension, currentIndex);

  // The row is draggable for reordering; a press on the slider must not start a row drag.
  const handlePointerDown = () => {
    onInteractionChange?.(true);
    const release = () => onInteractionChange?.(false);
    window.addEventListener("pointerup", release, { once: true });
    window.addEventListener("pointercancel", release, { once: true });
  };

  // The list ancestor uses select-all, so a press here would otherwise select and drag the whole list.
  return (
    <div className="pl-7 pr-2 pb-1 text-[8pt] select-none">
      <input
        type="range"
        className="range range-xs w-full"
        min={0}
        max={getTimeCount(timeDimension) - 1}
        step={1}
        value={currentIndex}
        disabled={!layer.visible}
        aria-label={`Time for ${layer.tocDisplayName}`}
        onPointerDown={handlePointerDown}
        onChange={(evt) => {
          stopLayerRefresh(layer.id);
          setTimeIndex(layer.id, Number(evt.target.value));
        }}
      />
      <div className="truncate" title={currentValue}>
        {formatTimeValue(currentValue)}
      </div>
    </div>
  );
}

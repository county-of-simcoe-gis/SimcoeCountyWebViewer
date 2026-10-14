import React from "react";
import type { TOCLayer } from "@/stores/tocStore";
import { useLayerTimeStore } from "@/stores/layerTimeStore";
import { setTimeIndex, stopLayerRefresh } from "@/utils/openlayers/LayerRefresh";
import { formatTimeValue, getTimeCount, getTimeValueAt } from "@/utils/timeDimension";

interface LayerTimeSliderProps {
  layer: TOCLayer;
}

export default function LayerTimeSlider({ layer }: LayerTimeSliderProps) {
  const storedIndex = useLayerTimeStore((state) => state.indexes[layer.id]);
  const timeDimension = layer.timeDimension;
  if (!timeDimension) return null;

  const currentIndex = storedIndex ?? timeDimension.defaultIndex;
  const currentValue = getTimeValueAt(timeDimension, currentIndex);

  return (
    <div className="flex items-center gap-2 pl-7 pr-2 pb-1 text-[8pt]">
      <input
        type="range"
        className="range range-xs flex-1"
        min={0}
        max={getTimeCount(timeDimension) - 1}
        step={1}
        value={currentIndex}
        disabled={!layer.visible}
        aria-label={`Time for ${layer.tocDisplayName}`}
        onChange={(evt) => {
          stopLayerRefresh(layer.id);
          setTimeIndex(layer.id, Number(evt.target.value));
        }}
      />
      <span className="shrink-0 whitespace-nowrap" title={currentValue}>
        {formatTimeValue(currentValue)}
      </span>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Graticule from "ol/layer/Graticule";
import { Stroke } from "ol/style";
import { MdGridOff, MdGridOn } from "react-icons/md";
import Map from "ol/Map";

// React component for the grid toggle button
interface GridButtonProps {
  map?: Map;
}

export const GridButton = React.memo(({ map }: GridButtonProps) => {
  const [showGrid, setShowGrid] = useState(false);
  const [graticuleLayer] = useState(
    () =>
      new Graticule({
        strokeStyle: new Stroke({
          color: "rgba(255,120,0,0.9)",
          width: 2,
          lineDash: [0.5, 4],
        }),
        showLabels: true,
        wrapX: false,
        zIndex: 10000,
      })
  );

  useEffect(() => {
    if (!map) return;

    if (showGrid) {
      map.addLayer(graticuleLayer);
    } else {
      map.removeLayer(graticuleLayer);
    }

    // Cleanup function to remove the layer when component unmounts or showGrid changes
    return () => {
      if (map.getLayers().getArray().includes(graticuleLayer)) {
        map.removeLayer(graticuleLayer);
      }
    };
  }, [showGrid, map, graticuleLayer]);

  return (
    <div
      className="w-[38px] h-[38px] bg-gradient-to-b from-white to-gray-200 rounded-full shadow-md bg-center inline-flex items-center justify-center cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-shadow duration-200"
      onClick={() => setShowGrid(!showGrid)}
      title={`${showGrid ? "Hide" : "Show"} map grid`}
    >
      {showGrid ? <MdGridOff size={25} className="text-gray-500" /> : <MdGridOn size={25} className="text-gray-500" />}
    </div>
  );
});

GridButton.displayName = "GridButton";

// Default export is now just the React component
export default GridButton;

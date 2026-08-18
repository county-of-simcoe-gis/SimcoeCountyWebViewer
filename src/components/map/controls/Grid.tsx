import React, { useEffect, useState, useRef } from "react";
import Graticule from "ol/layer/Graticule";
import { Stroke } from "ol/style";
import { MdGridOff, MdGridOn } from "react-icons/md";
import Map from "ol/Map";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { MapControlButton } from "@/components/ui/MapControlButton";

// React component for the grid toggle button
interface GridButtonProps {
  map?: Map;
}

const GridButtonComponent = ({ map }: GridButtonProps) => {
  const [showGrid, setShowGrid] = useState(false);
  const layerIdRef = useRef<string | null>(null);

  // Initialize graticule layer once using useMemo
  const graticuleLayer = React.useMemo(() => {
    return new Graticule({
      strokeStyle: new Stroke({
        color: "rgba(255,120,0,0.9)",
        width: 2,
        lineDash: [0.5, 4],
      }),
      showLabels: true,
      wrapX: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        layerIdRef.current = null;
      }
    };
  }, []);

  const handleToggle = () => {
    if (!map) return;

    if (!showGrid) {
      // Turn on grid
      const id = LayerManager.addLayer(graticuleLayer, "Overlay", "Grid Graticule", {
        index: 0,
        metadata: {
          isGrid: true,
          isOverlay: true,
        },
      });
      layerIdRef.current = id;
      setShowGrid(true);
    } else {
      // Turn off grid
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        layerIdRef.current = null;
      }
      setShowGrid(false);
    }
  };

  return (
    <MapControlButton onClick={handleToggle} title={`${showGrid ? "Hide" : "Show"} map grid`}>
      {showGrid ? <MdGridOff size={25} className="text-base-content" /> : <MdGridOn size={25} className="text-base-content" />}
    </MapControlButton>
  );
};

GridButtonComponent.displayName = "GridButton";

// Default export - not using memo during testing/debugging
export default GridButtonComponent;

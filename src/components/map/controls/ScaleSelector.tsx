import React, { useEffect, useState } from "react";
import { getMapScale } from "@/utils/mapHelpers";
import Map from "ol/Map";

// React component for scale selector
interface ScaleSelectorProps {
  map?: Map;
}

export function ScaleSelector({ map }: ScaleSelectorProps) {
  const [scale, setScale] = useState(0);
  const mapScales = [{ value: 250 }, { value: 500 }, { value: 1000 }, { value: 2000 }, { value: 5000 }, { value: 10000 }, { value: 25000 }, { value: 50000 }];

  useEffect(() => {
    if (map) {
      const updateScale = () => {
        setScale(getMapScale(map));
      };

      updateScale();
      map.getView().on("change:resolution", updateScale);

      return () => {
        map.getView().un("change:resolution", updateScale);
      };
    }
  }, [map]);

  const onScaleClick = (value: string) => {
    if (!map) return;

    // Convert scale to zoom level - this is an approximation
    // You may need to adjust this based on your map's projection and configuration
    const scaleValue = Number(value);
    const zoom = Math.log2(591657527.591555 / scaleValue);

    map.getView().setZoom(zoom);
  };

  return (
    <div className="flex items-center border border-base-300 ol-scale-line rounded">
      <label className="text-base-content text-xs">Scale:</label>
      <select
        className="border border-base-content/40 text-base-content bg-base-100 text-xs rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
        onChange={(evt) => {
          onScaleClick(evt.target.value);
        }}
        value={scale}
      >
        <option value={scale}>{"1:" + scale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</option>
        {mapScales.map((item) => {
          return (
            <option key={item.value} value={item.value}>
              {"1:" + item.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// Default export is now just the React component
export default ScaleSelector;

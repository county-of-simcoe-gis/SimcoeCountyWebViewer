import React, { useEffect, useMemo, useState } from "react";
import { getMapScale } from "@/utils/mapHelpers";
import Map from "ol/Map";

// Scale denominator at zoom level 0 for EPSG:3857 (Web Mercator)
const EPSG3857_SCALE_AT_ZOOM0 = 591657527.591555;

function scaleToZoom(scaleValue: number): number {
  return Math.log2(EPSG3857_SCALE_AT_ZOOM0 / scaleValue);
}

function zoomToScale(zoom: number): number {
  return Math.round(EPSG3857_SCALE_AT_ZOOM0 / Math.pow(2, zoom));
}

// React component for scale selector
interface ScaleSelectorProps {
  map?: Map;
}

export function ScaleSelector({ map }: ScaleSelectorProps) {
  const [scale, setScale] = useState(0);

  const mapScales = useMemo(() => {
    if (!map) return [];
    const view = map.getView();
    const minZoom = Math.ceil(view.getMinZoom());
    const maxZoom = Math.floor(view.getMaxZoom());
    const scales: { value: number }[] = [];
    for (let z = maxZoom; z >= minZoom; z--) {
      scales.push({ value: zoomToScale(z) });
    }
    return scales;
  }, [map]);

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

    const scaleValue = Number(value);
    const zoom = scaleToZoom(scaleValue);

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

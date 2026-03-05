"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getArea, getLength } from "ol/sphere.js";
import type { MyMapsItem } from "@/types/myMaps";
import * as helpers from "@/utils/myMapsHelpers";
import { getPublicPath } from "@/utils/getPublicPath";
import "@/components/myMaps/MyMapsMeasure.css";

interface MyMapsMeasureProps {
  visible: boolean;
  item: MyMapsItem;
}

const MyMapsMeasure: React.FC<MyMapsMeasureProps> = ({ visible, item }) => {
  const [units, setUnits] = useState<string>("meters");
  const [result, setResult] = useState<string>("");
  const [autoFormat, setAutoFormat] = useState<boolean>(true);

  // Initialize units based on geometry type
  useEffect(() => {
    if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
      setUnits("acres");
    } else {
      setUnits("meters");
    }
  }, [item.geometryType]);

  // Update results when units, autoFormat, or item changes
  const updateResults = useCallback(() => {
    if (!item.featureGeoJSON) {
      setResult("");
      return;
    }

    // Conversion functions with access to current units state
    const convertFromMetersLine = (distance: number): number => {
      switch (units) {
        case "meters":
          return distance;
        case "kilometers":
          return distance / 1000;
        case "miles":
          return distance / 1609.34;
        case "feet":
          return distance * 3.281;
        case "yards":
          return distance / 0.9144;
        case "nauticalMiles":
          return distance / 1852;
        default:
          return distance;
      }
    };

    const convertFromMetersPolygon = (area: number): number => {
      switch (units) {
        case "square meters":
          return area;
        case "acres":
          return area / 4046.856;
        case "square feet":
          return area * 10.764;
        case "square kilometers":
          return area / 1000000;
        case "square miles":
          return area * 0.000000038610215855;
        case "hectares":
          return area / 10000;
        default:
          return area;
      }
    };

    try {
      const feature = helpers.featureFromGeoJSON(item.featureGeoJSON);
      const geometry = feature.getGeometry();

      if (!geometry) {
        setResult("");
        return;
      }

      if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        // Format length output with current units
        const lengthMeters = getLength(geometry);
        const convertedLength = convertFromMetersLine(lengthMeters);
        const formattedLength = autoFormat ? numberWithCommas(Number(Math.round(convertedLength + "e" + 3) + "e-" + 3)) : convertedLength.toString();
        setResult(formattedLength);
      } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
        // Format area output with current units
        const areaMeters = getArea(geometry);
        const convertedArea = convertFromMetersPolygon(areaMeters);
        const formattedArea = autoFormat ? numberWithCommas(Number(Math.round(convertedArea + "e" + 3) + "e-" + 3)) : convertedArea.toString();
        setResult(formattedArea);
      } else {
        setResult("N/A");
      }
    } catch (error) {
      console.error("Error calculating measurement:", error);
      setResult("Error");
    }
  }, [item.featureGeoJSON, item.geometryType, units, autoFormat]);

  // Update results whenever dependencies change
  useEffect(() => {
    updateResults();
  }, [updateResults]);

  // Listen for custom events from the overlay DOM handlers (since React handlers are lost)
  useEffect(() => {
    if (!visible) return;

    const handleUnitsUpdate = (event: CustomEvent) => {
      console.log("🎯 Received units update:", event.detail.units);
      setUnits(event.detail.units);
    };

    const handleAutoFormatUpdate = (event: CustomEvent) => {
      console.log("🎯 Received auto-format update:", event.detail.autoFormat);
      setAutoFormat(event.detail.autoFormat);
    };

    // Listen on document since the event bubbles up
    document.addEventListener("measureUnitsUpdate", handleUnitsUpdate as EventListener);
    document.addEventListener("measureAutoFormatUpdate", handleAutoFormatUpdate as EventListener);

    return () => {
      document.removeEventListener("measureUnitsUpdate", handleUnitsUpdate as EventListener);
      document.removeEventListener("measureAutoFormatUpdate", handleAutoFormatUpdate as EventListener);
    };
  }, [visible]); // Re-run when visibility changes

  const onUnitChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    setUnits(evt.target.value);
  };

  const onAutoFormatChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setAutoFormat(evt.target.checked);
  };

  const numberWithCommas = (x: number): string => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (!visible) {
    return <div className="sc-hidden" />;
  }

  return (
    <fieldset className="sc-fieldset">
      <legend>
        <img src={getPublicPath("/images/measure.png")} alt="measure" />
        &nbsp; Measure
      </legend>
      <div className="sc-mymaps-measure-container">
        <label>Measurement Units:</label>
        <label className="sc-mymaps-measure-auto-format-label">
          Auto Format
          <input type="checkbox" checked={autoFormat} onChange={onAutoFormatChange} />
        </label>

        {/* Line String Units */}
        <select
          className={item.geometryType === "LineString" || item.geometryType === "MultiLineString" ? "sc-mymaps-measure-units" : "sc-hidden"}
          name="lineUnits"
          value={units}
          onChange={onUnitChange}
        >
          <option value="meters">Meters</option>
          <option value="kilometers">Kilometers</option>
          <option value="feet">Feet</option>
          <option value="miles">Miles</option>
          <option value="yards">Yards</option>
          <option value="nauticalMiles">Nautical Miles</option>
        </select>

        {/* Polygon Units */}
        <select className={item.geometryType === "Polygon" || item.geometryType === "MultiPolygon" ? "sc-mymaps-measure-units" : "sc-hidden"} name="areaUnits" value={units} onChange={onUnitChange}>
          <option value="acres">Acres</option>
          <option value="hectares">Hectares</option>
          <option value="square meters">Square Meters</option>
          <option value="square feet">Square Feet</option>
          <option value="square kilometers">Square Kilometers</option>
          <option value="square miles">Square Miles</option>
        </select>

        <input className="sc-mymaps-measure-result" readOnly value={result} />
      </div>
    </fieldset>
  );
};

export default MyMapsMeasure;

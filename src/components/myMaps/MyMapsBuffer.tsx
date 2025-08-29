"use client";

import React, { useState, useRef, useEffect } from "react";
import { Feature } from "ol";
import { Style, Stroke, Fill } from "ol/style";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";
import { featureFromGeoJSON, generateUID } from "@/utils/myMapsHelpers";
import { bufferGeometry, convertToMeters } from "@/utils/openlayers/BufferHelpers";
import { MYMAPS_CONSTANTS } from "@/types/myMaps";
import { activateTab } from "@/utils/helpersUI";
import type { MyMapsItem } from "@/types/myMaps";
import "./MyMapsBuffer.css";

interface MyMapsBufferProps {
  visible: boolean;
  item: MyMapsItem;
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

const MyMapsBuffer: React.FC<MyMapsBufferProps> = ({ visible, item }) => {
  const { map } = useMapStore();
  const { emit } = useEventStore();

  const [color, setColor] = useState<ColorRGB>({ r: 85, g: 243, b: 30, a: 1 });
  const [distance, setDistance] = useState<number>(0);
  const [units, setUnits] = useState<string>("meters");
  const [addMessageVisible, setAddMessageVisible] = useState<boolean>(false);

  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const bufferFeatureRef = useRef<Feature | null>(null);

  // Create vector layer for buffer preview
  useEffect(() => {
    if (!map) return;

    // Create layer for buffer preview
    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      zIndex: 999,
    });

    vectorLayerRef.current = vectorLayer;
    map.addLayer(vectorLayer);

    return () => {
      // Cleanup layer on unmount
      if (map && vectorLayer) {
        map.removeLayer(vectorLayer);
      }
    };
  }, [map]);

  // Cleanup when popup closes or component unmounts
  useEffect(() => {
    const cleanup = () => {
      if (vectorLayerRef.current && map) {
        map.removeLayer(vectorLayerRef.current);
      }
      setAddMessageVisible(false);
    };

    // Listen for popup close events
    const handlePopupClose = () => cleanup();

    // Since we don't have window.emitter in the new app, we'll rely on the component unmounting
    return cleanup;
  }, [map]);

  // Create style for buffer preview
  const getStyle = (): Style => {
    return new Style({
      stroke: new Stroke({
        color: [color.r, color.g, color.b, 1],
        width: 3,
      }),
      fill: new Fill({
        color: [color.r, color.g, color.b, 0.7],
      }),
    });
  };

  // Convert hex color to RGB
  const hexToRgb = (hex: string): ColorRGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
          a: 1,
        }
      : { r: 85, g: 243, b: 30, a: 1 };
  };

  // Handle color picker button click
  const onColorPickerButton = () => {
    // Cycle through available colors for simplicity
    // In the old app, this would show a CompactPicker popup
    const currentIndex = MYMAPS_CONSTANTS.DEFAULT_COLORS.findIndex((c) => rgbToHex(color) === c);
    const nextIndex = (currentIndex + 1) % MYMAPS_CONSTANTS.DEFAULT_COLORS.length;
    const nextColor = MYMAPS_CONSTANTS.DEFAULT_COLORS[nextIndex];

    const rgbColor = hexToRgb(nextColor);
    setColor(rgbColor);

    // Update buffer preview if exists
    if (vectorLayerRef.current) {
      vectorLayerRef.current.setStyle(getStyle());
      if (!isNaN(distance) && distance > 0) {
        onPreviewBufferClick();
      }
    }
  };

  // Convert RGB to hex
  const rgbToHex = (rgb: ColorRGB): string => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  };

  // Handle distance change
  const onDistanceChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newDistance = parseFloat(evt.target.value);
    setDistance(newDistance);

    if (!isNaN(newDistance)) {
      onPreviewBufferClick();
    }
  };

  // Handle units change
  const onUnitsChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    setUnits(evt.target.value);

    if (!isNaN(distance)) {
      onPreviewBufferClick();
    }
  };

  // Preview buffer on map
  const onPreviewBufferClick = () => {
    if (!item.featureGeoJSON || !vectorLayerRef.current) {
      return;
    }

    try {
      // Get feature from item's GeoJSON
      const feature = featureFromGeoJSON(item.featureGeoJSON);
      const geometry = feature.getGeometry();

      if (!geometry) {
        return;
      }

      const distanceMeters = convertToMeters(distance, units);

      bufferGeometry(geometry, distanceMeters, (bufferedGeometry) => {
        const bufferFeature = new Feature({
          geometry: bufferedGeometry,
        });

        bufferFeature.setStyle(getStyle());
        bufferFeatureRef.current = bufferFeature;

        // Clear previous buffer and add new one
        vectorLayerRef.current!.getSource()!.clear();

        if (distanceMeters > 0) {
          vectorLayerRef.current!.setZIndex(999);
        } else {
          vectorLayerRef.current!.setZIndex(9999);
        }

        vectorLayerRef.current!.getSource()!.addFeature(bufferFeature);
        setAddMessageVisible(true);
      });
    } catch (error) {
      console.error("Error creating buffer preview:", error);
    }
  };

  // Add buffer to MyMaps
  const onAddBufferToMyMaps = () => {
    if (bufferFeatureRef.current) {
      const label = `Buffer - ${distance} ${units}`;

      // Emit event to add the buffer feature to MyMaps
      emit("addMyMapsFeature", {
        feature: bufferFeatureRef.current,
        label: label,
      });

      // Hide the add message
      setAddMessageVisible(false);

      // Clear the buffer preview
      if (vectorLayerRef.current) {
        vectorLayerRef.current.getSource()!.clear();
      }

      // Activate the MyMaps tab to show the newly added buffer
      console.log("Attempting to activate MyMaps tab...");
      activateTab("mymaps");
    }
  };

  if (!visible) {
    return <div className="sc-hidden" />;
  }

  const rgbColor = `rgb(${color.r},${color.g},${color.b})`;

  return (
    <fieldset className="sc-fieldset">
      <legend>
        <img src="/images/buffer.png" alt="buffer" />
        &nbsp; Buffer
      </legend>
      <div className="sc-mymaps-buffer-container">
        <label style={{ gridColumnStart: "1" }}>Distance:</label>
        <label style={{ gridColumnStart: "2" }}>Units:</label>

        <input type="number" className="sc-editable" value={distance} onChange={onDistanceChange} style={{ gridColumnStart: "1", gridRowStart: "2" }} />

        <select name="pointOutline" value={units} onChange={onUnitsChange} style={{ gridColumnStart: "2", gridRowStart: "2" }}>
          <option value="meters">Meters</option>
          <option value="kilometers">Kilometers</option>
          <option value="feet">Feet</option>
          <option value="miles">Miles</option>
          <option value="yards">Yards</option>
          <option value="nauticalMiles">Nautical Miles</option>
        </select>

        <button
          id="sc-mymaps-buffer-color-button-picker"
          title="Change Buffer Color"
          onClick={onColorPickerButton}
          style={{
            gridColumnStart: "1",
            gridRowStart: "3",
            backgroundColor: rgbColor,
            cursor: "pointer",
            margin: "3px",
          }}
        />

        <label
          className={addMessageVisible ? "sc-fakeLink" : "sc-hidden"}
          style={{
            gridColumn: "1 / 3",
            gridRowStart: "4",
            textAlign: "-webkit-center" as any,
            alignSelf: "center",
          }}
          onClick={onAddBufferToMyMaps}
        >
          Add this buffer to MyMap Items
        </label>
      </div>
    </fieldset>
  );
};

export default MyMapsBuffer;

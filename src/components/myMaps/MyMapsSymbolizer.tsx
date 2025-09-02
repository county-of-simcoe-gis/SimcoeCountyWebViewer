"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Style, Stroke, Fill, Circle as CircleStyle, RegularShape } from "ol/style";
import type { MyMapsItem } from "@/types/myMaps";

import { useMyMapsStore } from "@/stores/myMapsStore";
import "./MyMapsSymbolizer.css";

interface MyMapsSymbolizerProps {
  visible: boolean;
  item: MyMapsItem;
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface SymbolizerState {
  selectedPointStyleDropDown: string;
  selectedStrokeTypeDropDown: string;
  strokeColor: ColorRGB;
  strokeWidth: number;
  strokeAlpha: number;
  fillColor: ColorRGB;
  fillAlpha: number;
  radius: number;
  rotation: number;
}

const MyMapsSymbolizer: React.FC<MyMapsSymbolizerProps> = ({ visible, item }) => {
  const { updateItem } = useMyMapsStore();

  // Constants from old app
  const sliderRadiusMin = 1;
  const sliderRadiusMax = 100;
  const sliderFillOpacityMin = 0;
  const sliderFillOpacityMax = 1;
  const sliderStrokeOpacityMin = 0;
  const sliderStrokeOpacityMax = 1;
  const sliderStrokeWidthMin = 1;
  const sliderStrokeWidthMax = 10;
  const sliderRotationMin = 0;
  const sliderRotationMax = 6.28319;

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string): ColorRGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
          a: 1,
        }
      : { r: 0, g: 0, b: 0, a: 1 };
  };

  // Extract initial values from item's style
  const getInitialState = useCallback((): SymbolizerState => {
    let fillColor: ColorRGB = { r: 0, g: 0, b: 0, a: 0.8 };
    let strokeColor: ColorRGB = { r: 0, g: 0, b: 0, a: 0.8 };
    let strokeWidth = 1;
    let radius = 8;
    const rotation = 0;
    let pointType = "circle"; // Default point type
    let extractedPointType = false; // Track if we extracted point type from OpenLayers object

    // Try to extract values from style if available - handle both OpenLayers Style objects and JSON format
    if (item.style) {
      // Check if it's an OpenLayers Style object
      if (item.style instanceof Style) {
        console.log("🔍 MyMapsSymbolizer: Reading from OpenLayers Style object");

        // Use OpenLayers public API methods
        const imageStyle = item.style.getImage();
        if (imageStyle) {
          // Handle CircleStyle
          if (imageStyle instanceof CircleStyle) {
            radius = imageStyle.getRadius();
            // Point type is always "circle" for CircleStyle
            pointType = "circle";
            extractedPointType = true;
            console.log("🔍 MyMapsSymbolizer: Point type from CircleStyle:", "circle");

            const fill = imageStyle.getFill();
            if (fill) {
              const fillColorArray = fill.getColor() as [number, number, number, number];
              if (Array.isArray(fillColorArray)) {
                fillColor = { r: fillColorArray[0], g: fillColorArray[1], b: fillColorArray[2], a: fillColorArray[3] || 0.8 };
                console.log("🔍 MyMapsSymbolizer: Extracted fill color from OpenLayers:", fillColor);
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              strokeWidth = stroke.getWidth() || 1;
              const strokeColorArray = stroke.getColor() as [number, number, number, number];
              if (Array.isArray(strokeColorArray)) {
                strokeColor = { r: strokeColorArray[0], g: strokeColorArray[1], b: strokeColorArray[2], a: strokeColorArray[3] || 0.8 };
                console.log("🔍 MyMapsSymbolizer: Extracted stroke color from OpenLayers:", strokeColor);
              }
            }
          }
          // Handle RegularShape
          else if (imageStyle instanceof RegularShape) {
            radius = imageStyle.getRadius();

            // Extract point type from RegularShape properties
            const points = imageStyle.getPoints();
            const radius2 = imageStyle.getRadius2();

            if (points === 4 && radius2 === 0) {
              pointType = "cross";
            } else if (points === 4 && radius2 !== 0) {
              pointType = "square";
            } else if (points === 3) {
              pointType = "triangle";
            } else if (points === 5) {
              pointType = "star";
            } else {
              pointType = "circle"; // fallback
            }

            extractedPointType = true;
            console.log("🔍 MyMapsSymbolizer: Point type from RegularShape:", pointType, { points, radius2 });

            const fill = imageStyle.getFill();
            if (fill) {
              const fillColorArray = fill.getColor() as [number, number, number, number];
              if (Array.isArray(fillColorArray)) {
                fillColor = { r: fillColorArray[0], g: fillColorArray[1], b: fillColorArray[2], a: fillColorArray[3] || 0.8 };
                console.log("🔍 MyMapsSymbolizer: Extracted RegularShape fill color from OpenLayers:", fillColor);
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              strokeWidth = stroke.getWidth() || 1;
              const strokeColorArray = stroke.getColor() as [number, number, number, number];
              if (Array.isArray(strokeColorArray)) {
                strokeColor = { r: strokeColorArray[0], g: strokeColorArray[1], b: strokeColorArray[2], a: strokeColorArray[3] || 0.8 };
                console.log("🔍 MyMapsSymbolizer: Extracted RegularShape stroke color from OpenLayers:", strokeColor);
              }
            }
          }
        }
      } else {
        // Regular JSON object format
        console.log("🔍 MyMapsSymbolizer: Reading from JSON style object");
        const style = item.style as {
          image?: {
            fill?: { color?: string | [number, number, number, number] };
            stroke?: { color?: string | [number, number, number, number]; width?: number };
            radius?: number;
            type?: string;
          };
          fill?: { color?: string | [number, number, number, number] };
          stroke?: { color?: string | [number, number, number, number]; width?: number };
        };

        // Fill color
        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          if (style.image?.fill?.color) {
            const color = style.image.fill.color;
            fillColor = Array.isArray(color) ? { r: color[0], g: color[1], b: color[2], a: color[3] || 0.8 } : hexToRgb(color.toString());
            console.log("🔍 MyMapsSymbolizer: Extracted fill color from JSON:", fillColor);
          }
        } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
          if (style.fill?.color) {
            const color = style.fill.color;
            fillColor = Array.isArray(color) ? { r: color[0], g: color[1], b: color[2], a: color[3] || 0.8 } : hexToRgb(color.toString());
          }
        }

        // Stroke color and width
        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          if (style.image?.stroke?.color) {
            const color = style.image.stroke.color;
            strokeColor = Array.isArray(color) ? { r: color[0], g: color[1], b: color[2], a: color[3] || 0.8 } : hexToRgb(color.toString());
            console.log("🔍 MyMapsSymbolizer: Extracted stroke color from JSON:", strokeColor);
          }
          strokeWidth = style.image?.stroke?.width || 1;
          radius = style.image?.radius || 8;
        } else {
          if (style.stroke?.color) {
            const color = style.stroke.color;
            strokeColor = Array.isArray(color) ? { r: color[0], g: color[1], b: color[2], a: color[3] || 0.8 } : hexToRgb(color.toString());
          }
          strokeWidth = style.stroke?.width || 1;
        }
      }
    }

    // Use extracted pointType if we got it from OpenLayers object, otherwise fall back to item.pointType
    const finalPointType = extractedPointType ? pointType : item.pointType !== undefined ? item.pointType : "circle";
    const strokeType = item.strokeType !== undefined ? item.strokeType : "normal";

    console.log("🔍 MyMapsSymbolizer: Final point type determined:", finalPointType, {
      extracted: pointType,
      fromItem: item.pointType,
      usedExtracted: extractedPointType,
    });

    return {
      selectedPointStyleDropDown: finalPointType,
      selectedStrokeTypeDropDown: strokeType,
      strokeColor,
      strokeWidth,
      strokeAlpha: strokeColor.a,
      fillColor,
      fillAlpha: fillColor.a,
      radius,
      rotation,
    };
  }, [item]);

  const [state, setState] = useState<SymbolizerState>(getInitialState);

  // Update state when item changes
  useEffect(() => {
    setState(getInitialState());
  }, [item.id, getInitialState]);

  // Style creation functions matching the old app's drawingHelpers
  const getPointStyle = (
    pointType: string,
    radius: number,
    strokeColor: [number, number, number, number],
    strokeWidth: number,
    fillColor: [number, number, number, number],
    rotation: number,
    strokeType: string
  ): Style => {
    const strokeConfig: { color: [number, number, number, number]; width: number; lineDash?: number[] } = {
      color: strokeColor,
      width: strokeWidth,
    };

    // Add line dash for stroke types
    if (strokeType === "dash") {
      strokeConfig.lineDash = [10, 10];
    } else if (strokeType === "dot") {
      strokeConfig.lineDash = [2, 8];
    }

    let imageStyle;

    if (pointType === "circle") {
      imageStyle = new CircleStyle({
        radius: radius,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke(strokeConfig),
      });
    } else {
      // For other shapes, use RegularShape
      let points = 4;
      let radius2 = undefined;

      switch (pointType) {
        case "square":
          points = 4;
          break;
        case "triangle":
          points = 3;
          break;
        case "star":
          points = 5;
          radius2 = radius * 0.5;
          break;
        case "cross":
          points = 4;
          radius2 = 0;
          break;
        case "x":
          points = 4;
          radius2 = 0;
          rotation = Math.PI / 4;
          break;
      }

      imageStyle = new RegularShape({
        points: points,
        radius: radius,
        radius2: radius2,
        angle: rotation,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke(strokeConfig),
      });
    }

    return new Style({
      image: imageStyle,
    });
  };

  const getLineStringStyle = (strokeColor: [number, number, number, number], strokeWidth: number, strokeType: string): Style => {
    const strokeConfig: { color: [number, number, number, number]; width: number; lineDash?: number[] } = {
      color: strokeColor,
      width: strokeWidth,
    };

    if (strokeType === "dash") {
      strokeConfig.lineDash = [10, 10];
    } else if (strokeType === "dot") {
      strokeConfig.lineDash = [2, 8];
    }

    return new Style({
      stroke: new Stroke(strokeConfig),
    });
  };

  const getPolygonStyle = (strokeColor: [number, number, number, number], strokeWidth: number, fillColor: [number, number, number, number], strokeType: string): Style => {
    const strokeConfig: { color: [number, number, number, number]; width: number; lineDash?: number[] } = {
      color: strokeColor,
      width: strokeWidth,
    };

    if (strokeType === "dash") {
      strokeConfig.lineDash = [10, 10];
    } else if (strokeType === "dot") {
      strokeConfig.lineDash = [2, 8];
    }

    return new Style({
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke(strokeConfig),
    });
  };

  // Update item with new style - preserve pointType and strokeType consistently
  const updateItemStyle = (newStyle: Style, additionalProps: Partial<MyMapsItem> = {}) => {
    console.log("💾 MyMapsSymbolizer: Saving new style:", newStyle);

    // Always preserve the current pointType and strokeType from state
    const currentPointType = additionalProps.pointType || state.selectedPointStyleDropDown || item.pointType || "circle";
    const currentStrokeType = additionalProps.strokeType || state.selectedStrokeTypeDropDown || item.strokeType || "normal";

    console.log("💾 Preserving pointType:", currentPointType, "strokeType:", currentStrokeType);

    const updates = {
      style: newStyle, // Store the OpenLayers Style object directly
      pointType: currentPointType, // Always preserve pointType at the top level
      strokeType: currentStrokeType, // Always preserve strokeType at the top level
      ...additionalProps,
    };
    updateItem(item.id, updates);
  };

  // Event handlers
  const onPointStyleDropDown = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const newPointType = evt.target.value;
    setState((prev) => ({ ...prev, selectedPointStyleDropDown: newPointType }));

    const style = getPointStyle(
      newPointType,
      state.radius,
      [state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeAlpha],
      state.strokeWidth,
      [state.fillColor.r, state.fillColor.g, state.fillColor.b, state.fillAlpha],
      state.rotation,
      state.selectedStrokeTypeDropDown
    );

    updateItemStyle(style, { pointType: newPointType });
  };

  const onStrokeTypeDropDown = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const newStrokeType = evt.target.value;
    setState((prev) => ({ ...prev, selectedStrokeTypeDropDown: newStrokeType }));

    let style: Style;
    if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
      style = getPointStyle(
        state.selectedPointStyleDropDown,
        state.radius,
        [state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeAlpha],
        state.strokeWidth,
        [state.fillColor.r, state.fillColor.g, state.fillColor.b, state.fillAlpha],
        state.rotation,
        newStrokeType
      );
    } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
      style = getLineStringStyle([state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeAlpha], state.strokeWidth, newStrokeType);
    } else {
      style = getPolygonStyle(
        [state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeAlpha],
        state.strokeWidth,
        [state.fillColor.r, state.fillColor.g, state.fillColor.b, state.fillAlpha],
        newStrokeType
      );
    }

    updateItemStyle(style, { strokeType: newStrokeType });
  };

  const onRadiusSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseFloat(evt.target.value);

    // Use setState callback to get current state values and avoid stale closures
    setState((prevState) => {
      const updatedState = { ...prevState, radius: newRadius };

      // Create style with current state values (not stale ones)
      const style = getPointStyle(
        prevState.selectedPointStyleDropDown,
        newRadius,
        [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
        prevState.strokeWidth,
        [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
        prevState.rotation,
        prevState.selectedStrokeTypeDropDown
      );

      // Update store with current values (not stale ones)
      updateItemStyle(style, {
        pointType: prevState.selectedPointStyleDropDown,
        strokeType: prevState.selectedStrokeTypeDropDown,
      });

      return updatedState;
    });
  };

  const onStrokeWidthSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newStrokeWidth = parseFloat(evt.target.value);

    // Use setState callback to get current state values and avoid stale closures
    setState((prevState) => {
      const updatedState = { ...prevState, strokeWidth: newStrokeWidth };

      let style: Style;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          prevState.selectedPointStyleDropDown,
          prevState.radius,
          [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
          newStrokeWidth,
          [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
          prevState.rotation,
          prevState.selectedStrokeTypeDropDown
        );
      } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        style = getLineStringStyle([prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha], newStrokeWidth, prevState.selectedStrokeTypeDropDown);
      } else {
        style = getPolygonStyle(
          [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
          newStrokeWidth,
          [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
          prevState.selectedStrokeTypeDropDown
        );
      }

      updateItemStyle(style, {
        pointType: prevState.selectedPointStyleDropDown,
        strokeType: prevState.selectedStrokeTypeDropDown,
      });

      return updatedState;
    });
  };

  const onFillOpacitySliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newFillAlpha = parseFloat(evt.target.value);

    // Use setState callback to get current state values and avoid stale closures
    setState((prevState) => {
      const updatedState = { ...prevState, fillAlpha: newFillAlpha };

      let style: Style;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          prevState.selectedPointStyleDropDown,
          prevState.radius,
          [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
          prevState.strokeWidth,
          [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, newFillAlpha],
          prevState.rotation,
          prevState.selectedStrokeTypeDropDown
        );
      } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
        style = getPolygonStyle(
          [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
          prevState.strokeWidth,
          [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, newFillAlpha],
          prevState.selectedStrokeTypeDropDown
        );
      } else {
        return updatedState; // LineString doesn't have fill
      }

      updateItemStyle(style, {
        pointType: prevState.selectedPointStyleDropDown,
        strokeType: prevState.selectedStrokeTypeDropDown,
      });

      return updatedState;
    });
  };

  const onStrokeOpacitySliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newStrokeAlpha = parseFloat(evt.target.value);

    // Use setState callback to get current state values and avoid stale closures
    setState((prevState) => {
      const updatedState = { ...prevState, strokeAlpha: newStrokeAlpha };

      let style: Style;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          prevState.selectedPointStyleDropDown,
          prevState.radius,
          [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, newStrokeAlpha],
          prevState.strokeWidth,
          [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
          prevState.rotation,
          prevState.selectedStrokeTypeDropDown
        );
      } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        style = getLineStringStyle([prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, newStrokeAlpha], prevState.strokeWidth, prevState.selectedStrokeTypeDropDown);
      } else {
        style = getPolygonStyle(
          [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, newStrokeAlpha],
          prevState.strokeWidth,
          [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
          prevState.selectedStrokeTypeDropDown
        );
      }

      updateItemStyle(style, {
        pointType: prevState.selectedPointStyleDropDown,
        strokeType: prevState.selectedStrokeTypeDropDown,
      });

      return updatedState;
    });
  };

  const onRotationSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newRotation = parseFloat(evt.target.value);

    // Use setState callback to get current state values and avoid stale closures
    setState((prevState) => {
      const updatedState = { ...prevState, rotation: newRotation };

      const style = getPointStyle(
        prevState.selectedPointStyleDropDown,
        prevState.radius,
        [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
        prevState.strokeWidth,
        [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
        newRotation,
        prevState.selectedStrokeTypeDropDown
      );

      updateItemStyle(style, {
        pointType: prevState.selectedPointStyleDropDown,
        strokeType: prevState.selectedStrokeTypeDropDown,
      });

      return updatedState;
    });
  };

  // Color picker handlers
  const onFillColorPickerButton = (evt: React.MouseEvent) => {
    showColorPicker(evt.nativeEvent, "fill");
  };

  const onStrokeColorPickerButton = (evt: React.MouseEvent) => {
    showColorPicker(evt.nativeEvent, "stroke");
  };

  // Color picker implementation matching the old app's CompactPicker behavior
  const showColorPicker = (event: MouseEvent, colorType: "fill" | "stroke") => {
    // Remove any existing color picker
    const existingPicker = document.getElementById("sc-symbolizer-color-picker-container");
    if (existingPicker) {
      existingPicker.remove();
      return;
    }

    const currentColor = colorType === "fill" ? state.fillColor : state.strokeColor;
    const initialHex = rgbToHex(currentColor);

    // Create CompactPicker replica
    const colorPicker = document.createElement("div");
    colorPicker.id = "sc-symbolizer-color-picker-container";
    colorPicker.style.cssText = `
      position: absolute;
      z-index: 10000;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
    `;

    // CompactPicker colors - exact layout from react-color
    const compactColors = [
      "#4D4D4D",
      "#999999",
      "#FFFFFF",
      "#F44E3B",
      "#FE9200",
      "#FCDC00",
      "#DBDF00",
      "#A4DD00",
      "#68CCCA",
      "#73D8FF",
      "#AEA1FF",
      "#FDA1FF",
      "#333333",
      "#808080",
      "#cccccc",
      "#D33115",
      "#E27300",
      "#FCC400",
      "#B0BC00",
      "#68BC00",
      "#16A5A5",
      "#009CE0",
      "#7B64FF",
      "#FA28FF",
      "#000000",
      "#666666",
      "#B3B3B3",
      "#9F0500",
      "#C45100",
      "#FB9E00",
      "#808900",
      "#194D33",
      "#0C797D",
      "#0062B1",
      "#653294",
      "#AB149E",
    ];

    // Create the picker content
    colorPicker.innerHTML = `
      <div style="padding: 8px;">
        <div style="display: flex; flex-wrap: wrap; width: 270px;">
          ${compactColors
            .map(
              (color) => `
            <div class="color-swatch" 
                 data-color="${color}"
                 style="
                   width: 17px; 
                   height: 17px; 
                   background-color: ${color}; 
                   margin: 1px; 
                   cursor: pointer; 
                   border: 1px solid #ddd;
                   border-radius: 2px;
                 "></div>
          `
            )
            .join("")}
        </div>
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div id="selected-color-display" style="
                width: 16px; 
                height: 16px; 
                background-color: ${initialHex}; 
                border: 1px solid #ddd; 
                border-radius: 3px;
              "></div>
              <input 
                id="hex-input" 
                type="text" 
                value="${initialHex}"
                class="sc-color-picker-input"
                style="
                  width: 70px; 
                  font-size: 11px; 
                  border: 1px solid #ddd; 
                  border-radius: 2px; 
                  padding: 3px 5px;
                  font-weight: bold;
                "
              />
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <span style="display: flex; align-items: center; gap: 2px;">R <input id="r-input" type="number" min="0" max="255" value="${
                currentColor.r
              }" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
              <span style="display: flex; align-items: center; gap: 2px;">G <input id="g-input" type="number" min="0" max="255" value="${
                currentColor.g
              }" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
              <span style="display: flex; align-items: center; gap: 2px;">B <input id="b-input" type="number" min="0" max="255" value="${
                currentColor.b
              }" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Position the picker at cursor position like old app
    colorPicker.style.left = `${event.pageX}px`;
    colorPicker.style.top = `${event.pageY}px`;

    // Add to body
    document.body.appendChild(colorPicker);

    // Prevent event bubbling
    colorPicker.addEventListener("click", (e) => e.stopPropagation());
    colorPicker.addEventListener("mousedown", (e) => e.stopPropagation());

    // Add event listeners to color swatches
    const swatches = colorPicker.querySelectorAll(".color-swatch");
    swatches.forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        const selectedColor = (e.target as HTMLElement).getAttribute("data-color")!;
        handleColorSelection(selectedColor, colorType);
        updateColorDisplay(selectedColor);
        colorPicker.remove();
      });

      swatch.addEventListener("mouseenter", (e) => {
        const hoverColor = (e.target as HTMLElement).getAttribute("data-color")!;
        updateColorDisplay(hoverColor);
        (e.target as HTMLElement).style.border = "2px solid #333";
      });

      swatch.addEventListener("mouseleave", (e) => {
        (e.target as HTMLElement).style.border = "1px solid #ddd";
        const hexInput = document.getElementById("hex-input") as HTMLInputElement;
        if (hexInput) updateColorDisplay(hexInput.value);
      });
    });

    // Add input field event listeners
    const hexInput = colorPicker.querySelector("#hex-input") as HTMLInputElement;
    const rInput = colorPicker.querySelector("#r-input") as HTMLInputElement;
    const gInput = colorPicker.querySelector("#g-input") as HTMLInputElement;
    const bInput = colorPicker.querySelector("#b-input") as HTMLInputElement;

    if (hexInput) {
      hexInput.addEventListener("input", (e) => {
        const hexValue = (e.target as HTMLInputElement).value;
        if (isValidHex(hexValue)) {
          const rgb = hexToRgb(hexValue);
          updateRGBInputs(rgb.r, rgb.g, rgb.b);
          handleColorSelection(hexValue, colorType);
        }
      });
      hexInput.addEventListener("focus", (e) => e.stopPropagation());
      hexInput.addEventListener("click", (e) => e.stopPropagation());
    }

    const updateFromRGB = () => {
      const r = Math.max(0, Math.min(255, parseInt(rInput.value) || 0));
      const g = Math.max(0, Math.min(255, parseInt(gInput.value) || 0));
      const b = Math.max(0, Math.min(255, parseInt(bInput.value) || 0));

      rInput.value = r.toString();
      gInput.value = g.toString();
      bInput.value = b.toString();

      const hexValue = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
      hexInput.value = hexValue;
      updateColorDisplay(hexValue);
      handleColorSelection(hexValue, colorType);
    };

    [rInput, gInput, bInput].forEach((input) => {
      if (input) {
        input.addEventListener("input", updateFromRGB);
        input.addEventListener("focus", (e) => e.stopPropagation());
        input.addEventListener("click", (e) => e.stopPropagation());
      }
    });

    // Close picker when clicking outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (!colorPicker.contains(e.target as Node)) {
        colorPicker.remove();
        document.removeEventListener("click", handleOutsideClick);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 100);
  };

  // Helper function to convert RGB to hex
  const rgbToHex = (rgb: ColorRGB): string => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  };

  // Helper to validate hex color
  const isValidHex = (hex: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  // Color picker display helper functions
  const updateColorDisplay = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);
    const hexInput = document.getElementById("hex-input") as HTMLInputElement;
    const rInput = document.getElementById("r-input") as HTMLInputElement;
    const gInput = document.getElementById("g-input") as HTMLInputElement;
    const bInput = document.getElementById("b-input") as HTMLInputElement;

    if (hexInput) hexInput.value = hexColor.toUpperCase();
    if (rInput) rInput.value = rgb.r.toString();
    if (gInput) gInput.value = rgb.g.toString();
    if (bInput) bInput.value = rgb.b.toString();

    const colorDisplay = document.getElementById("selected-color-display");
    if (colorDisplay) {
      colorDisplay.style.backgroundColor = hexColor;
    }
  };

  const updateRGBInputs = (r: number, g: number, b: number) => {
    const rInput = document.getElementById("r-input") as HTMLInputElement;
    const gInput = document.getElementById("g-input") as HTMLInputElement;
    const bInput = document.getElementById("b-input") as HTMLInputElement;

    if (rInput) rInput.value = r.toString();
    if (gInput) gInput.value = g.toString();
    if (bInput) bInput.value = b.toString();
  };

  const handleColorSelection = (hexColor: string, colorType: "fill" | "stroke") => {
    const rgb = hexToRgb(hexColor);

    // Use setState callback to get current state values and avoid stale closures
    setState((prevState) => {
      const rgbWithAlpha = { ...rgb, a: colorType === "fill" ? prevState.fillAlpha : prevState.strokeAlpha };

      if (colorType === "fill") {
        const updatedState = { ...prevState, fillColor: rgbWithAlpha };

        let style: Style;
        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          style = getPointStyle(
            prevState.selectedPointStyleDropDown,
            prevState.radius,
            [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
            prevState.strokeWidth,
            [rgb.r, rgb.g, rgb.b, prevState.fillAlpha],
            prevState.rotation,
            prevState.selectedStrokeTypeDropDown
          );
        } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
          style = getPolygonStyle(
            [prevState.strokeColor.r, prevState.strokeColor.g, prevState.strokeColor.b, prevState.strokeAlpha],
            prevState.strokeWidth,
            [rgb.r, rgb.g, rgb.b, prevState.fillAlpha],
            prevState.selectedStrokeTypeDropDown
          );
        } else {
          return updatedState;
        }

        updateItemStyle(style, {
          pointType: prevState.selectedPointStyleDropDown,
          strokeType: prevState.selectedStrokeTypeDropDown,
        });

        return updatedState;
      } else {
        const updatedState = { ...prevState, strokeColor: rgbWithAlpha };

        let style: Style;
        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          style = getPointStyle(
            prevState.selectedPointStyleDropDown,
            prevState.radius,
            [rgb.r, rgb.g, rgb.b, prevState.strokeAlpha],
            prevState.strokeWidth,
            [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
            prevState.rotation,
            prevState.selectedStrokeTypeDropDown
          );
        } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
          style = getLineStringStyle([rgb.r, rgb.g, rgb.b, prevState.strokeAlpha], prevState.strokeWidth, prevState.selectedStrokeTypeDropDown);
        } else {
          style = getPolygonStyle(
            [rgb.r, rgb.g, rgb.b, prevState.strokeAlpha],
            prevState.strokeWidth,
            [prevState.fillColor.r, prevState.fillColor.g, prevState.fillColor.b, prevState.fillAlpha],
            prevState.selectedStrokeTypeDropDown
          );
        }

        updateItemStyle(style, {
          pointType: prevState.selectedPointStyleDropDown,
          strokeType: prevState.selectedStrokeTypeDropDown,
        });

        return updatedState;
      }
    });
  };

  if (!visible) {
    return <div className="sc-hidden" />;
  }

  const rgbFill = `rgb(${state.fillColor.r},${state.fillColor.g},${state.fillColor.b})`;
  const rgbStroke = `rgb(${state.strokeColor.r},${state.strokeColor.g},${state.strokeColor.b})`;
  const geometryType = item.geometryType;

  return (
    <fieldset className="sc-fieldset">
      <legend>
        <img src="/images/symbolizer.png" alt="symbolizer" />
        Symbolizer
      </legend>
      <div className="sc-mymaps-symbolizer-container">
        {/* POINT TYPE */}
        {geometryType === "Point" && (
          <>
            <label className="sc-mymaps-style-label">Style:</label>
            <select className="sc-mymaps-style-dropdown" name="pointSymbols" value={state.selectedPointStyleDropDown} onChange={onPointStyleDropDown}>
              <option value="circle">Circle</option>
              <option value="cross">Cross</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="star">Star</option>
              <option value="x">X</option>
            </select>
          </>
        )}

        {/* STYLE SIZE */}
        {geometryType === "Point" && (
          <>
            <label className="sc-mymaps-sub-label">Size:</label>
            <div className="sc-mymaps-symbolizer-slider size">
              <input type="range" style={{ width: "100%" }} min={sliderRadiusMin} max={sliderRadiusMax} value={state.radius} step="1" onChange={onRadiusSliderChange} />
            </div>
          </>
        )}

        {/* FILL COLOR */}
        {(geometryType === "Point" || geometryType === "Polygon" || geometryType === "MultiPolygon") && (
          <>
            <label className={geometryType === "Point" ? "sc-mymaps-sub-label" : "sc-mymaps-style-label"}>Color:</label>
            <div className="sc-mymaps-fill-color-button">
              <button
                id="sc-mymaps-symbolizer-color-button"
                style={{
                  backgroundColor: rgbFill,
                  width: "30px",
                  height: "15px",
                  cursor: "pointer",
                }}
                onMouseUp={onFillColorPickerButton}
              />
              <div className="sc-mymaps-symbolizer-slider opacity">
                <input
                  key="sc-mymaps-symbolizer-fill-opacity"
                  type="range"
                  style={{ width: "100%" }}
                  min={sliderFillOpacityMin}
                  max={sliderFillOpacityMax}
                  value={state.fillAlpha}
                  step="0.05"
                  onChange={onFillOpacitySliderChange}
                />
              </div>
            </div>
          </>
        )}

        {/* STROKE TYPE */}
        <label className="sc-mymaps-style-label">Outline:</label>
        <select className="sc-mymaps-style-dropdown" name="pointOutline" value={state.selectedStrokeTypeDropDown} onChange={onStrokeTypeDropDown}>
          <option value="normal">Normal</option>
          <option value="dash">Dash</option>
          <option value="dot">Dot</option>
        </select>

        {/* STROKE COLOR */}
        <label className="sc-mymaps-sub-label">Color:</label>
        <div className="sc-mymaps-fill-color-button">
          <button
            id="sc-mymaps-symbolizer-stroke-color-button"
            style={{
              backgroundColor: rgbStroke,
              width: "30px",
              height: "15px",
              cursor: "pointer",
            }}
            onMouseUp={onStrokeColorPickerButton}
          />
          <div className="sc-mymaps-symbolizer-slider opacity">
            <input
              key="sc-mymaps-symbolizer-stroke-opacity"
              type="range"
              style={{ width: "100%" }}
              min={sliderStrokeOpacityMin}
              max={sliderStrokeOpacityMax}
              value={state.strokeAlpha}
              step="0.05"
              onChange={onStrokeOpacitySliderChange}
            />
          </div>
        </div>

        {/* STROKE WIDTH */}
        <label className="sc-mymaps-sub-label">Width:</label>
        <div className="sc-mymaps-symbolizer-slider size">
          <input type="range" style={{ width: "100%" }} min={sliderStrokeWidthMin} max={sliderStrokeWidthMax} value={state.strokeWidth} step="0.5" onChange={onStrokeWidthSliderChange} />
        </div>

        {/* ROTATION */}
        {geometryType === "Point" && (
          <>
            <label className="sc-mymaps-style-label">Angle:</label>
            <div className="sc-mymaps-angle-slider">
              <div className="sc-mymaps-symbolizer-slider angle">
                <input type="range" min={sliderRotationMin} max={sliderRotationMax} value={state.rotation} step="0.1" onChange={onRotationSliderChange} />
              </div>
            </div>
          </>
        )}
      </div>
    </fieldset>
  );
};

export default MyMapsSymbolizer;

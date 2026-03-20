"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Style, Circle as CircleStyle, RegularShape } from "ol/style";
import type { MyMapsItem } from "@/types/myMaps";

import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { getPublicPath } from "@/utils/getPublicPath";

import ColorPicker from "./ColorPicker";
import {
  PointType,
  StyleSize,
  FillColor,
  StrokeType,
  StrokeColor,
  StrokeWidth,
  Rotation,
  LabelTextColor,
  LabelFontSize,
  LabelOutlineColor,
  LabelOutlineWidth,
  CalloutBackgroundColor,
  CalloutBorderColor,
  CalloutLineColor,
  CalloutAnchorColor,
} from "./MyMapsSymbolizerComponents";
import { getPointStyle, getLineStringStyle, getPolygonStyle, extractPointTypeFromStyle, getDefaultLabelStyle, type LabelStyleOptions } from "./myMapsStyles";

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

interface LabelStyleState {
  textColor: string;
  textSize: string;
  labelOutlineColor: string;
  labelOutlineWidth: number;
  backgroundColor: string;
  borderColor: string;
  lineColor: string;
  anchorColor: string;
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
  labelStyle: LabelStyleState;
}

interface ColorPickerState {
  visible: boolean;
  position: { x: number; y: number };
  colorType: "fill" | "stroke" | "label";
  labelColorType?: "textColor" | "labelOutlineColor" | "backgroundColor" | "borderColor" | "lineColor" | "anchorColor";
  currentColor: string;
}

// Constants
const SLIDER_RADIUS_MIN = 1;
const SLIDER_RADIUS_MAX = 100;
const SLIDER_FILL_OPACITY_MIN = 0;
const SLIDER_FILL_OPACITY_MAX = 1;
const SLIDER_STROKE_OPACITY_MIN = 0;
const SLIDER_STROKE_OPACITY_MAX = 1;
const SLIDER_STROKE_WIDTH_MIN = 1;
const SLIDER_STROKE_WIDTH_MAX = 10;
const SLIDER_ROTATION_MIN = 0;
const SLIDER_ROTATION_MAX = 6.28319;

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

// Helper to convert RGB to hex
const rgbToHex = (rgb: ColorRGB): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

const MyMapsSymbolizer: React.FC<MyMapsSymbolizerProps> = ({ visible, item }) => {
  const { updateItem } = useMyMapsStore();
  const { emit } = useEventStore();

  // Color picker state
  const [colorPicker, setColorPicker] = useState<ColorPickerState>({
    visible: false,
    position: { x: 0, y: 0 },
    colorType: "fill",
    currentColor: "#000000",
  });

  // Ref to track current color picker state for use in callbacks (avoids stale closure)
  const colorPickerRef = useRef<ColorPickerState>(colorPicker);
  useEffect(() => {
    colorPickerRef.current = colorPicker;
  }, [colorPicker]);

  // Extract initial values from item's style
  const getInitialState = useCallback((): SymbolizerState => {
    let fillColor: ColorRGB = { r: 0, g: 0, b: 0, a: 0.8 };
    let strokeColor: ColorRGB = { r: 0, g: 0, b: 0, a: 0.8 };
    let strokeWidth = 1;
    let radius = 8;
    let rotation = 0;
    let pointType = "circle";
    let extractedPointType = false;

    if (item.style) {
      if (item.style instanceof Style) {
        const imageStyle = item.style.getImage();
        if (imageStyle) {
          if (imageStyle instanceof CircleStyle) {
            radius = imageStyle.getRadius();
            pointType = "circle";
            extractedPointType = true;

            const fill = imageStyle.getFill();
            if (fill) {
              const fillColorArray = fill.getColor() as [number, number, number, number];
              if (Array.isArray(fillColorArray)) {
                fillColor = { r: fillColorArray[0], g: fillColorArray[1], b: fillColorArray[2], a: fillColorArray[3] || 0.8 };
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              strokeWidth = stroke.getWidth() || 1;
              const strokeColorArray = stroke.getColor() as [number, number, number, number];
              if (Array.isArray(strokeColorArray)) {
                strokeColor = { r: strokeColorArray[0], g: strokeColorArray[1], b: strokeColorArray[2], a: strokeColorArray[3] || 0.8 };
              }
            }
          } else if (imageStyle instanceof RegularShape) {
            radius = imageStyle.getRadius();
            rotation = imageStyle.getRotation() || 0;
            pointType = extractPointTypeFromStyle(imageStyle);
            extractedPointType = true;

            const fill = imageStyle.getFill();
            if (fill) {
              const fillColorArray = fill.getColor() as [number, number, number, number];
              if (Array.isArray(fillColorArray)) {
                fillColor = { r: fillColorArray[0], g: fillColorArray[1], b: fillColorArray[2], a: fillColorArray[3] || 0.8 };
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              strokeWidth = stroke.getWidth() || 1;
              const strokeColorArray = stroke.getColor() as [number, number, number, number];
              if (Array.isArray(strokeColorArray)) {
                strokeColor = { r: strokeColorArray[0], g: strokeColorArray[1], b: strokeColorArray[2], a: strokeColorArray[3] || 0.8 };
              }
            }
          }
        }

        // Handle polygon/line styles
        const styleStroke = item.style.getStroke();
        const styleFill = item.style.getFill();

        if (styleStroke && !item.style.getImage()) {
          strokeWidth = styleStroke.getWidth() || 1;
          const strokeColorArray = styleStroke.getColor() as [number, number, number, number];
          if (Array.isArray(strokeColorArray)) {
            strokeColor = { r: strokeColorArray[0], g: strokeColorArray[1], b: strokeColorArray[2], a: strokeColorArray[3] || 0.8 };
          }
        }

        if (styleFill && !item.style.getImage()) {
          const fillColorArray = styleFill.getColor() as [number, number, number, number];
          if (Array.isArray(fillColorArray)) {
            fillColor = { r: fillColorArray[0], g: fillColorArray[1], b: fillColorArray[2], a: fillColorArray[3] || 0.8 };
          }
        }
      }
    }

    const finalPointType = extractedPointType ? pointType : item.pointType !== undefined ? item.pointType : "circle";
    const strokeType = item.strokeType !== undefined ? item.strokeType : "normal";

    // Get label style from item or use defaults
    const defaultLabelStyle = getDefaultLabelStyle(item.drawType);
    let labelStyleState: LabelStyleState = {
      textColor: defaultLabelStyle.textColor,
      textSize: defaultLabelStyle.textSize,
      labelOutlineColor: defaultLabelStyle.outlineColor,
      labelOutlineWidth: defaultLabelStyle.outlineWidth,
      backgroundColor: defaultLabelStyle.backgroundColor,
      borderColor: defaultLabelStyle.borderColor,
      lineColor: defaultLabelStyle.lineColor,
      anchorColor: defaultLabelStyle.anchorColor,
    };

    if (item.labelStyle && typeof item.labelStyle === "object") {
      const ls = item.labelStyle as Record<string, unknown>;
      labelStyleState = {
        textColor: (ls.textColor as string) || labelStyleState.textColor,
        textSize: (ls.textSize as string) || labelStyleState.textSize,
        labelOutlineColor: (ls.outlineColor as string) || labelStyleState.labelOutlineColor,
        labelOutlineWidth: (ls.outlineWidth as number) ?? labelStyleState.labelOutlineWidth,
        backgroundColor: (ls.backgroundColor as string) || labelStyleState.backgroundColor,
        borderColor: (ls.borderColor as string) || labelStyleState.borderColor,
        lineColor: (ls.lineColor as string) || labelStyleState.lineColor,
        anchorColor: (ls.anchorColor as string) || labelStyleState.anchorColor,
      };
    }

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
      labelStyle: labelStyleState,
    };
  }, [item]);

  const [state, setState] = useState<SymbolizerState>(getInitialState);

  // Update state when item changes
  useEffect(() => {
    setState(getInitialState());
  }, [item.id, getInitialState]);

  // Update item with new style
  const updateItemStyle = useCallback(
    (newStyle: Style, additionalProps: Partial<MyMapsItem> = {}) => {
      const currentPointType = additionalProps.pointType || state.selectedPointStyleDropDown || item.pointType || "circle";
      const currentStrokeType = additionalProps.strokeType || state.selectedStrokeTypeDropDown || item.strokeType || "normal";

      updateItem(item.id, {
        style: newStyle,
        pointType: currentPointType,
        strokeType: currentStrokeType,
        ...additionalProps,
      });

      // Emit event to update the actual OpenLayers feature on the map
      emit("mymap-style-updated", {
        itemId: item.id,
        style: newStyle,
        pointType: currentPointType,
        strokeType: currentStrokeType,
      });
    },
    [item.id, item.pointType, item.strokeType, state.selectedPointStyleDropDown, state.selectedStrokeTypeDropDown, updateItem, emit],
  );

  // ============================================
  // EVENT HANDLERS - POINT STYLE
  // ============================================

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
      state.selectedStrokeTypeDropDown,
    );

    updateItemStyle(style, { pointType: newPointType });
  };

  const onRadiusSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseFloat(evt.target.value);

    setState((prev) => {
      const style = getPointStyle(
        prev.selectedPointStyleDropDown,
        newRadius,
        [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
        prev.strokeWidth,
        [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
        prev.rotation,
        prev.selectedStrokeTypeDropDown,
      );

      updateItemStyle(style, {
        pointType: prev.selectedPointStyleDropDown,
        strokeType: prev.selectedStrokeTypeDropDown,
      });

      return { ...prev, radius: newRadius };
    });
  };

  const onRotationSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newRotation = parseFloat(evt.target.value);

    setState((prev) => {
      const style = getPointStyle(
        prev.selectedPointStyleDropDown,
        prev.radius,
        [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
        prev.strokeWidth,
        [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
        newRotation,
        prev.selectedStrokeTypeDropDown,
      );

      updateItemStyle(style, {
        pointType: prev.selectedPointStyleDropDown,
        strokeType: prev.selectedStrokeTypeDropDown,
      });

      return { ...prev, rotation: newRotation };
    });
  };

  // ============================================
  // EVENT HANDLERS - STROKE
  // ============================================

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
        newStrokeType,
      );
    } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
      style = getLineStringStyle([state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeAlpha], state.strokeWidth, newStrokeType);
    } else {
      style = getPolygonStyle(
        [state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeAlpha],
        state.strokeWidth,
        [state.fillColor.r, state.fillColor.g, state.fillColor.b, state.fillAlpha],
        newStrokeType,
      );
    }

    updateItemStyle(style, { strokeType: newStrokeType });
  };

  const onStrokeWidthSliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newStrokeWidth = parseFloat(evt.target.value);

    setState((prev) => {
      let style: Style;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          prev.selectedPointStyleDropDown,
          prev.radius,
          [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
          newStrokeWidth,
          [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
          prev.rotation,
          prev.selectedStrokeTypeDropDown,
        );
      } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        style = getLineStringStyle([prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha], newStrokeWidth, prev.selectedStrokeTypeDropDown);
      } else {
        style = getPolygonStyle(
          [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
          newStrokeWidth,
          [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
          prev.selectedStrokeTypeDropDown,
        );
      }

      updateItemStyle(style, {
        pointType: prev.selectedPointStyleDropDown,
        strokeType: prev.selectedStrokeTypeDropDown,
      });

      return { ...prev, strokeWidth: newStrokeWidth };
    });
  };

  const onStrokeOpacitySliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newStrokeAlpha = parseFloat(evt.target.value);

    setState((prev) => {
      let style: Style;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          prev.selectedPointStyleDropDown,
          prev.radius,
          [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, newStrokeAlpha],
          prev.strokeWidth,
          [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
          prev.rotation,
          prev.selectedStrokeTypeDropDown,
        );
      } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
        style = getLineStringStyle([prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, newStrokeAlpha], prev.strokeWidth, prev.selectedStrokeTypeDropDown);
      } else {
        style = getPolygonStyle(
          [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, newStrokeAlpha],
          prev.strokeWidth,
          [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
          prev.selectedStrokeTypeDropDown,
        );
      }

      updateItemStyle(style, {
        pointType: prev.selectedPointStyleDropDown,
        strokeType: prev.selectedStrokeTypeDropDown,
      });

      return { ...prev, strokeAlpha: newStrokeAlpha };
    });
  };

  // ============================================
  // EVENT HANDLERS - FILL
  // ============================================

  const onFillOpacitySliderChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newFillAlpha = parseFloat(evt.target.value);

    setState((prev) => {
      let style: Style;
      if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
        style = getPointStyle(
          prev.selectedPointStyleDropDown,
          prev.radius,
          [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
          prev.strokeWidth,
          [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, newFillAlpha],
          prev.rotation,
          prev.selectedStrokeTypeDropDown,
        );
      } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
        style = getPolygonStyle(
          [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
          prev.strokeWidth,
          [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, newFillAlpha],
          prev.selectedStrokeTypeDropDown,
        );
      } else {
        return { ...prev, fillAlpha: newFillAlpha };
      }

      updateItemStyle(style, {
        pointType: prev.selectedPointStyleDropDown,
        strokeType: prev.selectedStrokeTypeDropDown,
      });

      return { ...prev, fillAlpha: newFillAlpha };
    });
  };

  // ============================================
  // COLOR PICKER HANDLERS
  // ============================================

  const onFillColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "fill",
      currentColor: rgbToHex(state.fillColor),
    });
  };

  const onStrokeColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "stroke",
      currentColor: rgbToHex(state.strokeColor),
    });
  };

  const handleColorChange = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);

    // Use ref to get current colorPicker state to avoid stale closure issues
    const currentColorPicker = colorPickerRef.current;

    console.log("🎨 MyMapsSymbolizer: handleColorChange called", {
      hexColor,
      colorType: currentColorPicker.colorType,
      labelColorType: currentColorPicker.labelColorType,
      itemId: item.id,
    });

    setState((prev) => {
      if (currentColorPicker.colorType === "fill") {
        const rgbWithAlpha = { ...rgb, a: prev.fillAlpha };

        let style: Style;
        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          style = getPointStyle(
            prev.selectedPointStyleDropDown,
            prev.radius,
            [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
            prev.strokeWidth,
            [rgb.r, rgb.g, rgb.b, prev.fillAlpha],
            prev.rotation,
            prev.selectedStrokeTypeDropDown,
          );
        } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
          style = getPolygonStyle(
            [prev.strokeColor.r, prev.strokeColor.g, prev.strokeColor.b, prev.strokeAlpha],
            prev.strokeWidth,
            [rgb.r, rgb.g, rgb.b, prev.fillAlpha],
            prev.selectedStrokeTypeDropDown,
          );
        } else {
          return { ...prev, fillColor: rgbWithAlpha };
        }

        updateItemStyle(style, {
          pointType: prev.selectedPointStyleDropDown,
          strokeType: prev.selectedStrokeTypeDropDown,
        });

        return { ...prev, fillColor: rgbWithAlpha };
      } else if (currentColorPicker.colorType === "stroke") {
        const rgbWithAlpha = { ...rgb, a: prev.strokeAlpha };

        let style: Style;
        if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
          style = getPointStyle(
            prev.selectedPointStyleDropDown,
            prev.radius,
            [rgb.r, rgb.g, rgb.b, prev.strokeAlpha],
            prev.strokeWidth,
            [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha],
            prev.rotation,
            prev.selectedStrokeTypeDropDown,
          );
        } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
          style = getLineStringStyle([rgb.r, rgb.g, rgb.b, prev.strokeAlpha], prev.strokeWidth, prev.selectedStrokeTypeDropDown);
        } else {
          style = getPolygonStyle([rgb.r, rgb.g, rgb.b, prev.strokeAlpha], prev.strokeWidth, [prev.fillColor.r, prev.fillColor.g, prev.fillColor.b, prev.fillAlpha], prev.selectedStrokeTypeDropDown);
        }

        updateItemStyle(style, {
          pointType: prev.selectedPointStyleDropDown,
          strokeType: prev.selectedStrokeTypeDropDown,
        });

        return { ...prev, strokeColor: rgbWithAlpha };
      } else if (currentColorPicker.colorType === "label" && currentColorPicker.labelColorType) {
        return handleLabelColorChange(prev, currentColorPicker.labelColorType, hexColor);
      }

      return prev;
    });
  };

  const closeColorPicker = () => {
    console.log("🔴 MyMapsSymbolizer: closeColorPicker called", {
      wasVisible: colorPicker.visible,
      colorType: colorPicker.colorType,
      labelColorType: colorPicker.labelColorType,
    });
    setColorPicker((prev) => ({ ...prev, visible: false }));
  };

  // ============================================
  // LABEL STYLE HANDLERS
  // ============================================

  const handleLabelColorChange = (prev: SymbolizerState, labelColorType: string, hexColor: string): SymbolizerState => {
    console.log("🏷️ MyMapsSymbolizer: handleLabelColorChange called", {
      labelColorType,
      hexColor,
      itemId: item.id,
    });

    const newLabelStyle = { ...prev.labelStyle };

    switch (labelColorType) {
      case "textColor":
        newLabelStyle.textColor = hexColor;
        break;
      case "labelOutlineColor":
        newLabelStyle.labelOutlineColor = hexColor;
        break;
      case "backgroundColor":
        newLabelStyle.backgroundColor = hexColor;
        break;
      case "borderColor":
        newLabelStyle.borderColor = hexColor;
        break;
      case "lineColor":
        newLabelStyle.lineColor = hexColor;
        break;
      case "anchorColor":
        newLabelStyle.anchorColor = hexColor;
        break;
    }

    // Update the item's labelStyle in the store
    const fullLabelStyle: LabelStyleOptions = {
      textColor: newLabelStyle.textColor,
      textSize: newLabelStyle.textSize,
      outlineColor: newLabelStyle.labelOutlineColor,
      outlineWidth: newLabelStyle.labelOutlineWidth,
      backgroundColor: newLabelStyle.backgroundColor,
      borderColor: newLabelStyle.borderColor,
      lineColor: newLabelStyle.lineColor,
      anchorColor: newLabelStyle.anchorColor,
    };

    updateItem(item.id, { labelStyle: fullLabelStyle });
    emit("mymap-label-style-change", { id: item.id, labelStyle: fullLabelStyle });

    return { ...prev, labelStyle: newLabelStyle };
  };

  const updateLabelStyle = (updates: Partial<LabelStyleState>) => {
    setState((prev) => {
      const newLabelStyle = { ...prev.labelStyle, ...updates };

      const fullLabelStyle: LabelStyleOptions = {
        textColor: newLabelStyle.textColor,
        textSize: newLabelStyle.textSize,
        outlineColor: newLabelStyle.labelOutlineColor,
        outlineWidth: newLabelStyle.labelOutlineWidth,
        backgroundColor: newLabelStyle.backgroundColor,
        borderColor: newLabelStyle.borderColor,
        lineColor: newLabelStyle.lineColor,
        anchorColor: newLabelStyle.anchorColor,
      };

      updateItem(item.id, { labelStyle: fullLabelStyle });
      emit("mymap-label-style-change", { id: item.id, labelStyle: fullLabelStyle });

      return { ...prev, labelStyle: newLabelStyle };
    });
  };

  const onTextColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "label",
      labelColorType: "textColor",
      currentColor: state.labelStyle.textColor,
    });
  };

  const onFontSizeChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    updateLabelStyle({ textSize: evt.target.value });
  };

  const onLabelOutlineColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "label",
      labelColorType: "labelOutlineColor",
      currentColor: state.labelStyle.labelOutlineColor,
    });
  };

  const onLabelOutlineWidthChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    updateLabelStyle({ labelOutlineWidth: parseFloat(evt.target.value) });
  };

  const onBackgroundColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "label",
      labelColorType: "backgroundColor",
      currentColor: state.labelStyle.backgroundColor,
    });
  };

  const onBorderColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "label",
      labelColorType: "borderColor",
      currentColor: state.labelStyle.borderColor,
    });
  };

  const onLineColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "label",
      labelColorType: "lineColor",
      currentColor: state.labelStyle.lineColor,
    });
  };

  const onAnchorColorPickerButton = (evt: React.MouseEvent) => {
    setColorPicker({
      visible: true,
      position: { x: evt.clientX, y: evt.clientY },
      colorType: "label",
      labelColorType: "anchorColor",
      currentColor: state.labelStyle.anchorColor,
    });
  };

  // ============================================
  // RENDER
  // ============================================

  console.log("🎯 MyMapsSymbolizer render", {
    visible,
    itemId: item.id,
    drawType: item.drawType,
    labelVisible: item.labelVisible,
    colorPickerVisible: colorPicker.visible,
  });

  if (!visible) {
    return <div className="hidden" />;
  }

  const rgbFill = `rgb(${state.fillColor.r},${state.fillColor.g},${state.fillColor.b})`;
  const rgbStroke = `rgb(${state.strokeColor.r},${state.strokeColor.g},${state.strokeColor.b})`;
  const geometryType = item.geometryType;
  const isPoint = geometryType === "Point" || geometryType === "MultiPoint";
  const isPolygon = geometryType === "Polygon" || geometryType === "MultiPolygon";
  const isCallout = item.drawType === "Callout";

  return (
    <fieldset className="border border-[#cecece] rounded-[3px] p-2 mb-[5px] bg-[#f9f9f9] w-full box-border m-0">
      <legend className="text-sm font-bold text-[#333] py-[2px] px-1.5 bg-[#f9f9f9] border border-[#cecece] rounded-[3px] flex items-center">
        {}
        <img src={getPublicPath("/images/symbolizer.png")} alt="symbolizer" className="w-4 h-4 block mr-1" />
        Symbolizer
      </legend>
      <div className="mymaps-symbolizer-container grid grid-cols-[25px_45px_52px_1fr] content-center gap-y-[5px] gap-x-[2px] w-full box-border mymaps-symbolizer-slider">
        {/* POINT TYPE */}
        <PointType visible={isPoint} selectedPointStyleDropDown={state.selectedPointStyleDropDown} onPointStyleDropDown={onPointStyleDropDown} />

        {/* STYLE SIZE */}
        <StyleSize visible={isPoint} sliderRadiusMin={SLIDER_RADIUS_MIN} sliderRadiusMax={SLIDER_RADIUS_MAX} radius={state.radius} onRadiusSliderChange={onRadiusSliderChange} />

        {/* FILL COLOR */}
        <FillColor
          visible={isPoint || isPolygon}
          isPolygon={isPolygon}
          rgbFill={rgbFill}
          fillAlpha={state.fillAlpha}
          sliderFillOpacityMin={SLIDER_FILL_OPACITY_MIN}
          sliderFillOpacityMax={SLIDER_FILL_OPACITY_MAX}
          onFillColorPickerButton={onFillColorPickerButton}
          onFillOpacitySliderChange={onFillOpacitySliderChange}
        />

        {/* STROKE TYPE */}
        <StrokeType visible={!isCallout} selectedStrokeTypeDropDown={state.selectedStrokeTypeDropDown} onStrokeTypeDropDown={onStrokeTypeDropDown} />

        {/* STROKE COLOR */}
        <StrokeColor
          visible={!isCallout}
          rgbStroke={rgbStroke}
          strokeAlpha={state.strokeAlpha}
          sliderStrokeOpacityMin={SLIDER_STROKE_OPACITY_MIN}
          sliderStrokeOpacityMax={SLIDER_STROKE_OPACITY_MAX}
          onStrokeColorPickerButton={onStrokeColorPickerButton}
          onStrokeOpacitySliderChange={onStrokeOpacitySliderChange}
        />

        {/* STROKE WIDTH */}
        <StrokeWidth
          visible={!isCallout}
          strokeWidth={state.strokeWidth}
          sliderStrokeWidthMin={SLIDER_STROKE_WIDTH_MIN}
          sliderStrokeWidthMax={SLIDER_STROKE_WIDTH_MAX}
          onStrokeWidthSliderChange={onStrokeWidthSliderChange}
        />

        {/* ROTATION */}
        <Rotation visible={isPoint} rotation={state.rotation} sliderRotationMin={SLIDER_ROTATION_MIN} sliderRotationMax={SLIDER_ROTATION_MAX} onRotationSliderChange={onRotationSliderChange} />

        {/* LABEL STYLE SECTION */}
        {item.labelVisible && (
          <>
            <div className="col-span-full font-bold text-[11px] text-[#333] border-t border-[#cecece] pt-2 mt-[5px] mb-[3px]">Label Style</div>

            <LabelTextColor visible={true} textColor={state.labelStyle.textColor} onTextColorPickerButton={onTextColorPickerButton} />

            <LabelFontSize visible={true} fontSize={state.labelStyle.textSize} onFontSizeChange={onFontSizeChange} />

            <LabelOutlineColor visible={true} outlineColor={state.labelStyle.labelOutlineColor} onOutlineColorPickerButton={onLabelOutlineColorPickerButton} />

            <LabelOutlineWidth visible={true} outlineWidth={state.labelStyle.labelOutlineWidth} onOutlineWidthChange={onLabelOutlineWidthChange} />

            {/* Callout-specific controls */}
            {item.drawType === "Callout" && (
              <>
                <div className="col-span-full font-bold text-[11px] text-[#333] border-t border-[#cecece] pt-2 mt-[5px] mb-[3px]">Callout Style</div>

                <CalloutBackgroundColor visible={true} backgroundColor={state.labelStyle.backgroundColor} onBackgroundColorPickerButton={onBackgroundColorPickerButton} />

                <CalloutBorderColor visible={true} borderColor={state.labelStyle.borderColor} onBorderColorPickerButton={onBorderColorPickerButton} />

                <CalloutLineColor visible={true} lineColor={state.labelStyle.lineColor} onLineColorPickerButton={onLineColorPickerButton} />

                <CalloutAnchorColor visible={true} anchorColor={state.labelStyle.anchorColor} onAnchorColorPickerButton={onAnchorColorPickerButton} />
              </>
            )}
          </>
        )}
      </div>

      {/* Color Picker Portal */}
      {colorPicker.visible && (
        <ColorPicker color={colorPicker.currentColor} position={colorPicker.position} onColorChange={handleColorChange} onClose={closeColorPicker} showRGBInputs={colorPicker.colorType !== "label"} />
      )}
    </fieldset>
  );
};

export default MyMapsSymbolizer;

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Style, Circle as CircleStyle, RegularShape } from "ol/style";
import type { MyMapsItem } from "@/types/myMaps";

import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import AppImage from "@/components/shared/AppImage";

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
import { type ColorRGB, parseOLColor, hexToRgb, rgbToHex, normalizeColorToHex, extractFontSize } from "@/utils/openlayers/ColorHelpers";

interface MyMapsSymbolizerProps {
  visible: boolean;
  item: MyMapsItem;
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
              const parsed = parseOLColor(fill.getColor());
              if (parsed) fillColor = parsed;
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              strokeWidth = stroke.getWidth() || 1;
              const parsed = parseOLColor(stroke.getColor());
              if (parsed) strokeColor = parsed;
            }
          } else if (imageStyle instanceof RegularShape) {
            radius = imageStyle.getRadius();
            rotation = imageStyle.getRotation() || 0;
            pointType = extractPointTypeFromStyle(imageStyle);
            extractedPointType = true;

            const fill = imageStyle.getFill();
            if (fill) {
              const parsed = parseOLColor(fill.getColor());
              if (parsed) fillColor = parsed;
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              strokeWidth = stroke.getWidth() || 1;
              const parsed = parseOLColor(stroke.getColor());
              if (parsed) strokeColor = parsed;
            }
          }
        }

        // Handle polygon/line styles
        const styleStroke = item.style.getStroke();
        const styleFill = item.style.getFill();

        if (styleStroke && !item.style.getImage()) {
          strokeWidth = styleStroke.getWidth() || 1;
          const parsed = parseOLColor(styleStroke.getColor());
          if (parsed) strokeColor = parsed;
        }

        if (styleFill && !item.style.getImage()) {
          const parsed = parseOLColor(styleFill.getColor());
          if (parsed) fillColor = parsed;
        }
      } else if (typeof item.style === "object") {
        // Handle plain JSON style object (e.g. from serialization/storage)
        const styleObj = item.style as Record<string, unknown>;
        const imageObj = styleObj.image as Record<string, unknown> | undefined;

        if (imageObj) {
          if (typeof imageObj.radius === "number") radius = imageObj.radius;
          if (typeof imageObj.type === "string") {
            pointType = imageObj.type;
            extractedPointType = true;
          }
          if (typeof imageObj.rotation === "number") rotation = imageObj.rotation;

          const imgFill = imageObj.fill as Record<string, unknown> | undefined;
          if (imgFill?.color) {
            const parsed = parseOLColor(imgFill.color);
            if (parsed) fillColor = parsed;
          }

          const imgStroke = imageObj.stroke as Record<string, unknown> | undefined;
          if (imgStroke) {
            if (typeof imgStroke.width === "number") strokeWidth = imgStroke.width;
            const parsed = parseOLColor(imgStroke.color);
            if (parsed) strokeColor = parsed;
          }
        }

        // Also check top-level fill/stroke.
        // For points with an image, the old serialization format stores the
        // user-chosen colors at the top level while image.stroke may hold a
        // default (#fff). Top-level values override image values when present.
        // For polygons/lines (no image), these are the only source.
        const objStroke = styleObj.stroke as Record<string, unknown> | undefined;
        if (objStroke) {
          if (typeof objStroke.width === "number") strokeWidth = objStroke.width;
          const parsed = parseOLColor(objStroke.color);
          if (parsed) strokeColor = parsed;
        }

        const objFill = styleObj.fill as Record<string, unknown> | undefined;
        if (objFill?.color) {
          const parsed = parseOLColor(objFill.color);
          if (parsed) fillColor = parsed;
        }
      }
    }

    const finalPointType = extractedPointType ? pointType : item.pointType !== undefined ? item.pointType : "circle";
    const strokeType = item.strokeType !== undefined ? item.strokeType : "normal";

    // Prefer actual feature text style values when available, then labelStyle/defaults.
    let actualTextSize: string | undefined;
    let actualTextColor: string | undefined;
    let actualOutlineColor: string | undefined;
    let actualOutlineWidth: number | undefined;

    if (item.style instanceof Style) {
      const textStyle = item.style.getText();
      actualTextSize = extractFontSize(textStyle?.getFont());
      actualTextColor = normalizeColorToHex(textStyle?.getFill()?.getColor());
      actualOutlineColor = normalizeColorToHex(textStyle?.getStroke()?.getColor());
      actualOutlineWidth = textStyle?.getStroke()?.getWidth();
    } else if (item.style && typeof item.style === "object") {
      const styleObj = item.style as Record<string, unknown>;
      const textObj = styleObj.text as Record<string, unknown> | undefined;
      actualTextSize = extractFontSize(typeof textObj?.font === "string" ? textObj.font : undefined);
      actualTextColor = normalizeColorToHex((textObj?.fill as Record<string, unknown> | undefined)?.color);
      actualOutlineColor = normalizeColorToHex((textObj?.stroke as Record<string, unknown> | undefined)?.color);
      actualOutlineWidth = typeof (textObj?.stroke as Record<string, unknown> | undefined)?.width === "number" ? ((textObj?.stroke as Record<string, unknown>).width as number) : undefined;
    }

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

    // Applied style is the source of truth when available.
    labelStyleState = {
      ...labelStyleState,
      textSize: actualTextSize || labelStyleState.textSize,
      textColor: actualTextColor || labelStyleState.textColor,
      labelOutlineColor: actualOutlineColor || labelStyleState.labelOutlineColor,
      labelOutlineWidth: actualOutlineWidth ?? labelStyleState.labelOutlineWidth,
    };

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

  // Re-initialize state when the item changes or the symbolizer becomes visible
  // (the item's style may have been modified while the symbolizer was hidden)
  useEffect(() => {
    if (visible) {
      setState(getInitialState());
    }
  }, [item.id, visible, getInitialState]);

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

    console.log("ðŸŽ¨ MyMapsSymbolizer: handleColorChange called", {
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
    console.log("ðŸ”´ MyMapsSymbolizer: closeColorPicker called", {
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
    console.log("ðŸ·ï¸ MyMapsSymbolizer: handleLabelColorChange called", {
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

  console.log("MyMapsSymbolizer render", {
    visible,
    itemId: item.id,
    drawType: item.drawType,
    labelVisible: item.labelVisible,
    colorPickerVisible: colorPicker.visible,
    labelStyle: item.labelStyle,
    style: item.style,
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
    <fieldset className="border border-base-300 rounded-[3px] p-2 mb-[5px] bg-base-200 w-full box-border m-0">
      <legend className="text-sm font-bold text-base-content py-[2px] px-1.5 bg-base-200 border border-base-300 rounded-[3px] flex items-center">
        {}
        <AppImage src="/images/symbolizer.png" alt="symbolizer" className="w-4 h-4 block mr-1" />
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
            <div className="col-span-full font-bold text-[11px] text-base-content border-t border-base-300 pt-2 mt-[5px] mb-[3px]">Label Style</div>

            <LabelTextColor visible={true} textColor={state.labelStyle.textColor} onTextColorPickerButton={onTextColorPickerButton} />

            <LabelFontSize visible={true} fontSize={state.labelStyle.textSize} onFontSizeChange={onFontSizeChange} />

            <LabelOutlineColor visible={true} outlineColor={state.labelStyle.labelOutlineColor} onOutlineColorPickerButton={onLabelOutlineColorPickerButton} />

            <LabelOutlineWidth visible={true} outlineWidth={state.labelStyle.labelOutlineWidth} onOutlineWidthChange={onLabelOutlineWidthChange} />

            {/* Callout-specific controls */}
            {item.drawType === "Callout" && (
              <>
                <div className="col-span-full font-bold text-[11px] text-base-content border-t border-base-300 pt-2 mt-[5px] mb-[3px]">Callout Style</div>

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

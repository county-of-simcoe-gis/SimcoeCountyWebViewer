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
    const defaultLabelStyle = getDefaultLabelStyle();
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
    setColorPicker((prev) => ({ ...prev, visible: false }));
  };

  // ============================================
  // LABEL STYLE HANDLERS
  // ============================================

  const handleLabelColorChange = (prev: SymbolizerState, labelColorType: string, hexColor: string): SymbolizerState => {

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

// ---------------------------------------------------------------------------
// DOM-copy event wiring (extracted from DrawingOptionsPopup monolith)
//
// When the popup HTML is copied into the OpenLayers overlay element via
// innerHTML, all React event handlers are stripped. This function re-attaches
// the symbolizer controls' event listeners directly to the overlay DOM and
// keeps the feature's style/labelStyle in sync with the store.
//
// `container` is the overlay element (overlayElementRef.current). `updateItem`
// and `emit` are supplied by the host component's store hooks.
// ---------------------------------------------------------------------------
type SymbolizerColorType = "fill" | "stroke" | "textColor" | "labelOutlineColor" | "backgroundColor" | "borderColor" | "lineColor" | "anchorColor";

export const attachSymbolizerListeners = (
  container: HTMLElement,
  item: MyMapsItem,
  updateItem: (id: string, updates: Partial<MyMapsItem>) => void,
  emit: (eventType: string, data?: { [key: string]: unknown }) => void,
): void => {
  if (!item) return;

  // Color utility function for hex conversion (used by color picker popup and state extraction)
  const hexToRgbObject = (colorStr: string): { r: number; g: number; b: number; a: number } => {
    // Handle rgba format: rgba(255, 0, 0, 0.5)
    const rgbaMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(colorStr);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1], 10),
        g: parseInt(rgbaMatch[2], 10),
        b: parseInt(rgbaMatch[3], 10),
        a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
      };
    }

    // Handle hex format: #ff0000
    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorStr);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16),
        a: 1,
      };
    }

    // Fallback
    return { r: 0, g: 0, b: 0, a: 1 };
  };

  // Helper function to extract current color from DOM color button
  const extractColorFromDOMButton = (buttonId: string): { r: number; g: number; b: number } => {
    const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
    const colorButton = symbolizerContainer?.querySelector(`#${buttonId}`) as HTMLButtonElement;

    if (colorButton && colorButton.style.backgroundColor) {
      const bgColor = colorButton.style.backgroundColor;

      // Handle rgb(r, g, b) format
      if (bgColor.startsWith("rgb(")) {
        const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
          };
        }
      }

      // Handle hex format
      if (bgColor.startsWith("#")) {
        const rgb = hexToRgbObject(bgColor);
        return { r: rgb.r, g: rgb.g, b: rgb.b };
      }
    }

    // Fallback to default colors
    return buttonId.includes("stroke") ? { r: 255, g: 255, b: 255 } : { r: 232, g: 9, b: 229 }; // Default white stroke, pink fill
  };

  // Helper function to get current symbolizer state from store/item (not DOM)
  const getCurrentSymbolizerState = () => {
    if (!item) return null;

    // If item has a style, try to extract values from it
    const currentState = {
      pointType: item.pointType || "circle",
      strokeType: item.strokeType || "normal",
      radius: 8,
      fillAlpha: item.fillAlpha ?? 0.8, // Use saved fillAlpha or default
      strokeAlpha: item.strokeAlpha ?? 1.0, // Use saved strokeAlpha or default
      strokeWidth: 2,
      rotation: 0,
      fillColor: { r: 232, g: 9, b: 229, a: item.fillAlpha ?? 0.8 }, // Default pink with saved alpha
      strokeColor: { r: 255, g: 255, b: 255, a: item.strokeAlpha ?? 1.0 }, // Default white with saved alpha
    };

    // Extract current values from style object - handle the actual storage format
    if (item.style) {

      // Check if it's an OpenLayers Style object
      if (item.style instanceof Style) {

        // POINTS: Use image styles (existing logic)
        const imageStyle = item.style.getImage();

        // LINES & POLYGONS: Use direct fill/stroke styles
        const directFill = item.style.getFill();
        const directStroke = item.style.getStroke();

        if (imageStyle) {
          // Handle CircleStyle
          if (imageStyle instanceof CircleStyle) {
            currentState.radius = imageStyle.getRadius();
            currentState.pointType = "circle";

            const fill = imageStyle.getFill();
            if (fill) {
              const fillColorRaw = fill.getColor();

              let fillColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(fillColorRaw)) {
                // Handle array format [r, g, b, a]
                fillColor = { r: fillColorRaw[0], g: fillColorRaw[1], b: fillColorRaw[2], a: fillColorRaw[3] || 0.8 };
              } else if (typeof fillColorRaw === "string") {
                // Handle string format (hex or rgba)
                fillColor = hexToRgbObject(fillColorRaw);
              }

              if (fillColor) {
                currentState.fillColor = fillColor;
                currentState.fillAlpha = fillColor.a;
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              currentState.strokeWidth = stroke.getWidth() || 2;
              const strokeColorRaw = stroke.getColor();

              let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(strokeColorRaw)) {
                // Handle array format [r, g, b, a]
                strokeColor = { r: strokeColorRaw[0], g: strokeColorRaw[1], b: strokeColorRaw[2], a: strokeColorRaw[3] || 1.0 };
              } else if (typeof strokeColorRaw === "string") {
                // Handle string format (hex or rgba)
                strokeColor = hexToRgbObject(strokeColorRaw);
              }

              if (strokeColor) {
                currentState.strokeColor = strokeColor;
                currentState.strokeAlpha = strokeColor.a;
              }
            }
          }
          // Handle RegularShape
          else if (imageStyle instanceof RegularShape) {
            currentState.radius = imageStyle.getRadius();
            currentState.rotation = imageStyle.getRotation(); // Extract rotation for Angle slider!
            const points = imageStyle.getPoints();
            const radius2 = imageStyle.getRadius2();

            if (points === 4 && radius2 === 0) {
              currentState.pointType = "cross";
            } else if (points === 4 && radius2 !== 0) {
              currentState.pointType = "square";
            } else if (points === 3) {
              currentState.pointType = "triangle";
            } else if (points === 5) {
              currentState.pointType = "star";
            }

            const fill = imageStyle.getFill();
            if (fill) {
              const fillColorRaw = fill.getColor();

              let fillColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(fillColorRaw)) {
                // Handle array format [r, g, b, a]
                fillColor = { r: fillColorRaw[0], g: fillColorRaw[1], b: fillColorRaw[2], a: fillColorRaw[3] || 0.8 };
              } else if (typeof fillColorRaw === "string") {
                // Handle string format (hex or rgba)
                fillColor = hexToRgbObject(fillColorRaw);
              }

              if (fillColor) {
                currentState.fillColor = fillColor;
                currentState.fillAlpha = fillColor.a;
              }
            }

            const stroke = imageStyle.getStroke();
            if (stroke) {
              currentState.strokeWidth = stroke.getWidth() || 2;
              const strokeColorRaw = stroke.getColor();

              let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(strokeColorRaw)) {
                // Handle array format [r, g, b, a]
                strokeColor = { r: strokeColorRaw[0], g: strokeColorRaw[1], b: strokeColorRaw[2], a: strokeColorRaw[3] || 1.0 };
              } else if (typeof strokeColorRaw === "string") {
                // Handle string format (hex or rgba)
                strokeColor = hexToRgbObject(strokeColorRaw);
              }

              if (strokeColor) {
                currentState.strokeColor = strokeColor;
                currentState.strokeAlpha = strokeColor.a;
              }
            }
          }
        }

        // LINES & POLYGONS: Handle direct fill/stroke styles (for non-point geometries)
        if (!imageStyle && (directFill || directStroke)) {

          // Handle direct fill (for polygons)
          if (directFill) {
            const fillColorRaw = directFill.getColor();

            let fillColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(fillColorRaw)) {
              // Handle array format [r, g, b, a]
              fillColor = { r: fillColorRaw[0], g: fillColorRaw[1], b: fillColorRaw[2], a: fillColorRaw[3] || 0.8 };
            } else if (typeof fillColorRaw === "string") {
              // Handle string format (hex or rgba)
              fillColor = hexToRgbObject(fillColorRaw);
            }

            if (fillColor) {
              currentState.fillColor = fillColor;
              currentState.fillAlpha = fillColor.a;
            }
          }

          // Handle direct stroke (for lines and polygons)
          if (directStroke) {
            const strokeColorRaw = directStroke.getColor();

            let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(strokeColorRaw)) {
              // Handle array format [r, g, b, a]
              strokeColor = { r: strokeColorRaw[0], g: strokeColorRaw[1], b: strokeColorRaw[2], a: strokeColorRaw[3] || 1.0 };
            } else if (typeof strokeColorRaw === "string") {
              // Handle string format (hex or rgba)
              strokeColor = hexToRgbObject(strokeColorRaw);
            }

            if (strokeColor) {
              currentState.strokeColor = strokeColor;
              currentState.strokeAlpha = strokeColor.a;
            }

            // Extract stroke width and dash pattern
            const extractedWidth = directStroke.getWidth();
            currentState.strokeWidth = extractedWidth || 2;

            const lineDash = directStroke.getLineDash();
            if (lineDash && lineDash.length > 0) {
              if (lineDash.length === 1 && lineDash[0] === 10) {
                currentState.strokeType = "dash";
              } else if (lineDash.length === 2 && lineDash[0] === 1 && lineDash[1] === 5) {
                currentState.strokeType = "dot";
              }
            }
          }
        }
      } else {
        const style = item.style as {
          image?: {
            fill?: { color?: string | [number, number, number, number] };
            stroke?: { color?: string | [number, number, number, number]; width?: number };
            radius?: number;
            type?: string;
            rotation?: number; // Add rotation for angle slider
          };
          fill?: { color?: string | [number, number, number, number] };
          stroke?: { color?: string | [number, number, number, number]; width?: number };
        };

        if (style.image) {

          // Extract basic properties
          currentState.radius = style.image.radius || 8;
          currentState.rotation = style.image.rotation || 0; // Extract rotation for angle slider
          currentState.pointType = style.image.type === "circle" ? "circle" : item.pointType || "circle";

          // Extract fill color - handle both array and string formats
          if (style.image.fill && style.image.fill.color) {
            const fillColorData = style.image.fill.color;

            let fillColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(fillColorData)) {
              // Handle array format [r, g, b, a]
              fillColor = { r: fillColorData[0], g: fillColorData[1], b: fillColorData[2], a: fillColorData[3] || 0.8 };
            } else if (typeof fillColorData === "string") {
              // Handle string format (hex or rgba)
              fillColor = hexToRgbObject(fillColorData);
            }

            if (fillColor) {
              currentState.fillColor = fillColor;
              currentState.fillAlpha = fillColor.a;
            }
          }

          // Extract stroke properties
          if (style.image.stroke) {

            currentState.strokeWidth = style.image.stroke.width || 2;

            // Extract stroke color - handle both array and string formats
            if (style.image.stroke.color) {
              const strokeColorData = style.image.stroke.color;

              let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

              if (Array.isArray(strokeColorData)) {
                // Handle array format [r, g, b, a]
                strokeColor = { r: strokeColorData[0], g: strokeColorData[1], b: strokeColorData[2], a: strokeColorData[3] || 1.0 };
              } else if (typeof strokeColorData === "string") {
                // Handle string format (hex or rgba)
                strokeColor = hexToRgbObject(strokeColorData);
              }

              if (strokeColor) {
                currentState.strokeColor = strokeColor;
                currentState.strokeAlpha = strokeColor.a;
              }
            }
          }
        }

        // LINES & POLYGONS: Handle direct fill/stroke in JSON (not from image)
        if (!style.image || (item.geometryType !== "Point" && item.geometryType !== "MultiPoint")) {

          // Handle direct fill (for polygons)
          if (style.fill && style.fill.color) {
            const fillColorData = style.fill.color;

            let fillColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(fillColorData)) {
              // Handle array format [r, g, b, a]
              fillColor = { r: fillColorData[0], g: fillColorData[1], b: fillColorData[2], a: fillColorData[3] || 0.8 };
            } else if (typeof fillColorData === "string") {
              // Handle string format (hex or rgba)
              fillColor = hexToRgbObject(fillColorData);
            }

            if (fillColor) {
              currentState.fillColor = fillColor;
              currentState.fillAlpha = fillColor.a;
            }
          }

          // Handle direct stroke (for lines and polygons)
          if (style.stroke && style.stroke.color) {
            const strokeColorData = style.stroke.color;

            let strokeColor: { r: number; g: number; b: number; a: number } | null = null;

            if (Array.isArray(strokeColorData)) {
              // Handle array format [r, g, b, a]
              strokeColor = { r: strokeColorData[0], g: strokeColorData[1], b: strokeColorData[2], a: strokeColorData[3] || 1.0 };
            } else if (typeof strokeColorData === "string") {
              // Handle string format (hex or rgba)
              strokeColor = hexToRgbObject(strokeColorData);
            }

            if (strokeColor) {
              currentState.strokeColor = strokeColor;
              currentState.strokeAlpha = strokeColor.a;
            }
          }

          // Handle stroke width from direct stroke
          if (style.stroke && style.stroke.width) {
            currentState.strokeWidth = style.stroke.width;
          } else {
          }
        }
      }
    }
    return currentState;
  };

  // Geometry-aware style creation function for all feature types
  const createPointStyleFromHelpers = (
    pointType: string,
    radius: number,
    strokeColor: [number, number, number, number],
    strokeWidth: number,
    fillColor: [number, number, number, number],
    rotation: number,
    strokeType: string,
  ) => {
    if (!item) {
      // Fallback to point style if no item
      return getPointStyle(pointType, radius, strokeColor, strokeWidth, fillColor, rotation, strokeType);
    }

    // Use geometry type to determine correct styling function
    if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
      return getPointStyle(pointType, radius, strokeColor, strokeWidth, fillColor, rotation, strokeType);
    } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
      return getLineStringStyle(strokeColor, strokeWidth, strokeType);
    } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
      return getPolygonStyle(strokeColor, strokeWidth, fillColor, strokeType);
    } else {
      // Fallback to point style for unknown geometry types
      console.warn("Unknown geometry type:", item.geometryType, "falling back to point style");
      return getPointStyle(pointType, radius, strokeColor, strokeWidth, fillColor, rotation, strokeType);
    }
  };

  /**
   * Read a slider value from the symbolizer container by its data-slider-type
   * attribute. Returns undefined if the slider is not present (e.g. fill-opacity
   * on a LineString).
   */
  const readSliderValue = (sliderContainer: Element | null | undefined, sliderType: string): number | undefined => {
    if (!sliderContainer) return undefined;
    const slider = sliderContainer.querySelector(`input[data-slider-type="${sliderType}"]`) as HTMLInputElement | null;
    return slider ? parseFloat(slider.value) : undefined;
  };

  /**
   * Read all symbolizer slider values from the overlay DOM using data-slider-type
   * attributes. Falls back to the supplied defaults for any slider not present in
   * the DOM (geometry-dependent visibility).
   */
  const readAllSliderValues = (sliderContainer: Element | null | undefined, defaults: { fillAlpha: number; strokeAlpha: number; strokeWidth: number; radius: number; rotation: number }) => ({
    fillAlpha: readSliderValue(sliderContainer, "fill-opacity") ?? defaults.fillAlpha,
    strokeAlpha: readSliderValue(sliderContainer, "stroke-opacity") ?? defaults.strokeAlpha,
    strokeWidth: readSliderValue(sliderContainer, "stroke-width") ?? defaults.strokeWidth,
    radius: readSliderValue(sliderContainer, "size") ?? defaults.radius,
    rotation: readSliderValue(sliderContainer, "rotation") ?? defaults.rotation,
  });

  // Function to update symbolizer point type
  const updateSymbolizerPointType = (itemId: string, newPointType: string) => {
    if (!item) return;

    // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
    const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
    const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
    const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

    // Get current state from store/item (not DOM)
    const state = getCurrentSymbolizerState();
    if (!state) return;

    // Read ALL current values from DOM using data-slider-type attributes
    const sliderValues = readAllSliderValues(symbolizerContainer, state);
    const currentRadius = sliderValues.radius;
    const currentFillAlpha = sliderValues.fillAlpha;
    const currentStrokeAlpha = sliderValues.strokeAlpha;
    const currentStrokeWidth = sliderValues.strokeWidth;
    const currentRotation = sliderValues.rotation;

    // Read current colors from DOM color buttons
    const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
    const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

    // Create new style with updated point type using ALL current DOM values
    const style = createPointStyleFromHelpers(
      newPointType, // Use the new point type
      currentRadius, // Use current radius from DOM
      [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, currentStrokeAlpha], // Use current values
      currentStrokeWidth, // Use current stroke width from DOM
      [currentFillColor.r, currentFillColor.g, currentFillColor.b, currentFillAlpha], // Use current values
      currentRotation, // Use current rotation from DOM
      currentStrokeType, // Use current stroke type from DOM
    );

    // Update the item in the store with the full OpenLayers style object
    const updates = {
      style: style,
      pointType: newPointType,
      strokeType: currentStrokeType,
    };
    updateItem(itemId, updates);

    // Emit event to refresh the feature on the map
    emit("mymap-style-updated", { itemId, style, pointType: newPointType });
  };

  // Function to update symbolizer fill color
  const updateSymbolizerFillColor = (itemId: string, newColor: { r: number; g: number; b: number }) => {
    if (!item) return;

    // CRITICAL FIX: Get current dropdown values AND slider values from DOM to preserve all current settings
    const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
    const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
    const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

    const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
    const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

    // Get current state from store/item (not DOM)
    const state = getCurrentSymbolizerState();
    if (!state) return;

    // Read ALL current values from DOM using data-slider-type attributes
    const sliderValues = readAllSliderValues(symbolizerContainer, state);
    const currentRadius = sliderValues.radius;
    const currentFillAlpha = sliderValues.fillAlpha;
    const currentStrokeAlpha = sliderValues.strokeAlpha;
    const currentStrokeWidth = sliderValues.strokeWidth;
    const currentRotation = sliderValues.rotation;

    // Read current stroke color from DOM
    const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

    // Update the fill color in state and override all values with DOM values
    const updatedState = {
      ...state,
      fillColor: { ...newColor, a: currentFillAlpha }, // Use DOM alpha
      strokeColor: { ...currentStrokeColor, a: currentStrokeAlpha }, // Use DOM stroke color and alpha
      pointType: currentPointType, // Override with DOM value
      strokeType: currentStrokeType, // Override with DOM value
      radius: currentRadius, // Override with DOM value
      strokeWidth: currentStrokeWidth, // Override with DOM value
      rotation: currentRotation, // Override with DOM value
      fillAlpha: currentFillAlpha, // Override with DOM value
      strokeAlpha: currentStrokeAlpha, // Override with DOM value
    };

    // Create new style with updated fill color
    const style = createPointStyleFromHelpers(
      updatedState.pointType,
      updatedState.radius,
      [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, updatedState.strokeAlpha],
      updatedState.strokeWidth,
      [newColor.r, newColor.g, newColor.b, updatedState.fillAlpha], // Use new fill color
      updatedState.rotation,
      updatedState.strokeType,
    );

    // Update the item in the store with the full OpenLayers style object (matching old app)
    const updates = {
      style: style, // Store the full OpenLayers style object
      pointType: updatedState.pointType, // Preserve pointType
      strokeType: updatedState.strokeType, // Preserve strokeType
    };
    updateItem(itemId, updates);

    // Emit event to refresh the feature on the map
    emit("mymap-style-updated", { itemId, style, fillColor: newColor });
  };

  // Function to update symbolizer stroke color
  const updateSymbolizerStrokeColor = (itemId: string, newColor: { r: number; g: number; b: number }) => {
    if (!item) return;

    // CRITICAL FIX: Get current dropdown values AND slider values from DOM to preserve all current settings
    const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
    const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
    const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

    const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
    const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

    // Get current state from store/item (not DOM)
    const state = getCurrentSymbolizerState();
    if (!state) return;

    // Read ALL current values from DOM using data-slider-type attributes
    const sliderValues = readAllSliderValues(symbolizerContainer, state);
    const currentRadius = sliderValues.radius;
    const currentFillAlpha = sliderValues.fillAlpha;
    const currentStrokeAlpha = sliderValues.strokeAlpha;
    const currentStrokeWidth = sliderValues.strokeWidth;
    const currentRotation = sliderValues.rotation;

    // Read current fill color from DOM
    const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");

    // Update the stroke color in state and override all values with DOM values
    const updatedState = {
      ...state,
      strokeColor: { ...newColor, a: currentStrokeAlpha }, // Use DOM alpha
      fillColor: { ...currentFillColor, a: currentFillAlpha }, // Use DOM fill color and alpha
      pointType: currentPointType, // Override with DOM value
      strokeType: currentStrokeType, // Override with DOM value
      radius: currentRadius, // Override with DOM value
      strokeWidth: currentStrokeWidth, // Override with DOM value
      rotation: currentRotation, // Override with DOM value
      fillAlpha: currentFillAlpha, // Override with DOM value
      strokeAlpha: currentStrokeAlpha, // Override with DOM value
    };

    // Create new style with updated stroke color
    const style = createPointStyleFromHelpers(
      updatedState.pointType,
      updatedState.radius,
      [newColor.r, newColor.g, newColor.b, updatedState.strokeAlpha], // Use new stroke color
      updatedState.strokeWidth,
      [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, updatedState.fillAlpha],
      updatedState.rotation,
      updatedState.strokeType,
    );

    // Update the item in the store with the full OpenLayers style object (matching old app)
    const updates = {
      style: style, // Store the full OpenLayers style object
      pointType: updatedState.pointType, // Preserve pointType
      strokeType: updatedState.strokeType, // Preserve strokeType
    };
    updateItem(itemId, updates);

    // Emit event to refresh the feature on the map
    emit("mymap-style-updated", { itemId, style, strokeColor: newColor });
  };

  // Function to update symbolizer fill opacity - GEOMETRY AWARE
  const updateSymbolizerFillOpacity = (itemId: string, newOpacity: number) => {
    if (!item) return;

    const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
    const state = getCurrentSymbolizerState();
    if (!state) return;

    // Read geometry-specific values from DOM
    let currentPointType = state.pointType;
    let currentStrokeType = state.strokeType;

    // Only read point-specific values for point geometries
    if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
      const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
      currentPointType = pointStyleSelect ? pointStyleSelect.value : currentPointType;
    }

    // Read stroke-specific values for all geometries that have strokes
    const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
    currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : currentStrokeType;

    // Read all slider values from DOM using data-slider-type attributes
    const sliderVals = readAllSliderValues(symbolizerContainer as Element | null, state);

    // Read current colors from DOM
    const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
    const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

    // Update the fill opacity in state
    const updatedState = {
      ...state,
      fillAlpha: newOpacity,
      fillColor: { ...currentFillColor, a: newOpacity }, // Use DOM fill color with new alpha
      strokeColor: { ...currentStrokeColor, a: sliderVals.strokeAlpha }, // Use DOM stroke color and alpha
      pointType: currentPointType,
      strokeType: currentStrokeType,
      radius: sliderVals.radius,
      strokeWidth: sliderVals.strokeWidth,
      rotation: sliderVals.rotation,
      strokeAlpha: sliderVals.strokeAlpha,
    };

    // Create new style - EXPLICIT GEOMETRY TYPE CHECKING like old app
    let style = null;
    if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
      style = getPointStyle(
        updatedState.pointType,
        updatedState.radius,
        [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, updatedState.strokeAlpha],
        updatedState.strokeWidth,
        [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, newOpacity], // Use new opacity
        updatedState.rotation,
        updatedState.strokeType,
      );
    } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
      style = getPolygonStyle(
        [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, updatedState.strokeAlpha],
        updatedState.strokeWidth,
        [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, newOpacity], // Use new opacity
        updatedState.strokeType,
      );
    }
    // Note: LineString doesn't have fill, so no style creation needed

    // Only update if style was created successfully
    if (style) {
      const updates = {
        style: style,
        pointType: updatedState.pointType,
        strokeType: updatedState.strokeType,
        fillAlpha: newOpacity, // Preserve fillAlpha for persistence
      };
      updateItem(itemId, updates);

      // Emit event to refresh the feature on the map
      emit("mymap-style-updated", { itemId, style, fillOpacity: newOpacity });
    }
  };

  // Function to update symbolizer stroke opacity - GEOMETRY AWARE
  const updateSymbolizerStrokeOpacity = (itemId: string, newOpacity: number) => {
    if (!item) return;

    const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
    const state = getCurrentSymbolizerState();
    if (!state) return;

    // Read geometry-specific values from DOM
    let currentPointType = state.pointType;
    let currentStrokeType = state.strokeType;

    // Only read point-specific values for point geometries
    if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
      const pointStyleSelect = symbolizerContainer?.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
      currentPointType = pointStyleSelect ? pointStyleSelect.value : currentPointType;
    }

    // Read stroke-specific values for all geometries that have strokes
    const strokeStyleSelect = symbolizerContainer?.querySelector("select[name='pointOutline']") as HTMLSelectElement;
    currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : currentStrokeType;

    // Read all slider values from DOM using data-slider-type attributes
    const sliderVals = readAllSliderValues(symbolizerContainer as Element | null, state);

    // Read current colors from DOM
    const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
    const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

    // Update the stroke opacity in state
    const updatedState = {
      ...state,
      strokeAlpha: newOpacity,
      fillColor: { ...currentFillColor, a: sliderVals.fillAlpha }, // Keep existing fill alpha - DON'T change it!
      strokeColor: { ...currentStrokeColor, a: newOpacity }, // Use new stroke alpha
      pointType: currentPointType,
      strokeType: currentStrokeType,
      radius: sliderVals.radius,
      strokeWidth: sliderVals.strokeWidth,
      rotation: sliderVals.rotation,
      fillAlpha: sliderVals.fillAlpha, // Preserve existing fill alpha
    };

    // Create new style - EXPLICIT GEOMETRY TYPE CHECKING like old app
    let style = null;
    if (item.geometryType === "Point" || item.geometryType === "MultiPoint") {
      style = getPointStyle(
        updatedState.pointType,
        updatedState.radius,
        [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, newOpacity], // Use new stroke opacity
        updatedState.strokeWidth,
        [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, updatedState.fillAlpha], // Keep existing fill
        updatedState.rotation,
        updatedState.strokeType,
      );
    } else if (item.geometryType === "LineString" || item.geometryType === "MultiLineString") {
      style = getLineStringStyle(
        [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, newOpacity], // Use new stroke opacity
        updatedState.strokeWidth,
        updatedState.strokeType,
      );
    } else if (item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") {
      style = getPolygonStyle(
        [updatedState.strokeColor.r, updatedState.strokeColor.g, updatedState.strokeColor.b, newOpacity], // Use new stroke opacity
        updatedState.strokeWidth,
        [updatedState.fillColor.r, updatedState.fillColor.g, updatedState.fillColor.b, updatedState.fillAlpha], // Keep existing fill
        updatedState.strokeType,
      );
    }

    // Only update if style was created successfully
    if (style) {
      const updates = {
        style: style,
        pointType: updatedState.pointType,
        strokeType: updatedState.strokeType,
        strokeAlpha: newOpacity, // Preserve strokeAlpha for persistence
      };
      updateItem(itemId, updates);

      // Emit event to refresh the feature on the map
      emit("mymap-style-updated", { itemId, style, strokeOpacity: newOpacity });
    }
  };

  // Function to show color picker popup (matching MyMapsSymbolizer approach)
  // Extended to support all color types including label/callout colors
  const showSymbolizerColorPicker = (event: MouseEvent, colorType: SymbolizerColorType) => {
    // Remove any existing color picker
    const existingPicker = document.getElementById("sc-symbolizer-color-picker-container");
    if (existingPicker) {
      existingPicker.remove();
      return;
    }

    if (!item?.id) return;

    // Create CompactPicker replica
    const colorPicker = document.createElement("div");
    colorPicker.id = "sc-symbolizer-color-picker-container";
    colorPicker.style.cssText = `
   position: absolute;
   z-index: 10000;
   background: white;
   border: 1px solid #ccc;
   border-radius: 4px;
   padding: 10px;
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

    // Create the picker content with color swatches
    let pickerHTML = '<div style="display: grid; grid-template-columns: repeat(12, 16px); gap: 2px;">';
    compactColors.forEach((color) => {
      pickerHTML += `
     <div 
       class="color-swatch" 
       style="
         width: 16px; 
         height: 16px; 
         background-color: ${color}; 
         border: 1px solid #ddd; 
         cursor: pointer;
         border-radius: 2px;
       " 
       data-color="${color}">
     </div>
   `;
    });
    pickerHTML += "</div>";

    colorPicker.innerHTML = pickerHTML;

    // Map color type to button ID for updating button background
    const colorTypeToButtonId: Record<SymbolizerColorType, string> = {
      fill: "sc-mymaps-symbolizer-color-button",
      stroke: "sc-mymaps-symbolizer-stroke-color-button",
      textColor: "sc-mymaps-symbolizer-text-color-button",
      labelOutlineColor: "sc-mymaps-symbolizer-label-outline-color-button",
      backgroundColor: "sc-mymaps-symbolizer-callout-background-color-button",
      borderColor: "sc-mymaps-symbolizer-callout-border-color-button",
      lineColor: "sc-mymaps-symbolizer-callout-line-color-button",
      anchorColor: "sc-mymaps-symbolizer-callout-anchor-color-button",
    };

    // Get current color from the button
    const currentButtonColor = (() => {
      const buttonId = colorTypeToButtonId[colorType];
      const btn = container.querySelector(`#${buttonId}`) as HTMLButtonElement;
      if (btn?.style.backgroundColor) {
        const rgbMatch = btn.style.backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
          return `#${r}${g}${b}`.toUpperCase();
        }
      }
      return "#000000";
    })();

    // Add hex/RGB inputs section
    const inputsSection = document.createElement("div");
    inputsSection.style.cssText = "margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;";
    inputsSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div id="sc-sym-picker-color-display" style="width: 16px; height: 16px; background-color: ${currentButtonColor}; border: 1px solid #ddd; border-radius: 3px;"></div>
          <input id="sc-sym-picker-hex" type="text" value="${currentButtonColor}" style="width: 70px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; font-weight: bold;" />
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <span style="display: flex; align-items: center; gap: 2px;">R <input id="sc-sym-picker-r" type="number" min="0" max="255" value="${hexToRgbObject(currentButtonColor).r}" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
          <span style="display: flex; align-items: center; gap: 2px;">G <input id="sc-sym-picker-g" type="number" min="0" max="255" value="${hexToRgbObject(currentButtonColor).g}" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
          <span style="display: flex; align-items: center; gap: 2px;">B <input id="sc-sym-picker-b" type="number" min="0" max="255" value="${hexToRgbObject(currentButtonColor).b}" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
        </div>
      </div>
    `;
    colorPicker.appendChild(inputsSection);

    // Helper to apply a color selection to the symbolizer
    const applyColorSelection = (selectedColor: string) => {
      const rgbColor = hexToRgbObject(selectedColor);

      // Update button color immediately
      const buttonId = colorTypeToButtonId[colorType];
      const targetButton = container.querySelector(`#${buttonId}`) as HTMLButtonElement;
      if (targetButton) {
        targetButton.style.backgroundColor = selectedColor;
      }

      // Update color display in picker
      const display = colorPicker.querySelector("#sc-sym-picker-color-display") as HTMLElement;
      if (display) display.style.backgroundColor = selectedColor;

      // Get the CURRENT item from store to avoid stale closure issues
      const currentItems = useMyMapsStore.getState().items;
      const currentItem = currentItems.find((i) => i.id === item?.id);
      if (!currentItem) return;

      // Update the style based on color type
      if (colorType === "fill") {
        updateSymbolizerFillColor(currentItem.id, { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b });
      } else if (colorType === "stroke") {
        updateSymbolizerStrokeColor(currentItem.id, { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b });
      } else {
        // Handle label/callout colors
        const defaultLabelStyle = getDefaultLabelStyle();
        const currentLabelStyle = {
          ...defaultLabelStyle,
          ...((currentItem.labelStyle as Record<string, unknown>) || {}),
        };

        const labelStylePropertyMap: Record<string, string> = {
          textColor: "textColor",
          labelOutlineColor: "outlineColor",
          backgroundColor: "backgroundColor",
          borderColor: "borderColor",
          lineColor: "lineColor",
          anchorColor: "anchorColor",
        };

        const propertyName = labelStylePropertyMap[colorType];
        if (propertyName) {
          const updatedLabelStyle = {
            ...currentLabelStyle,
            [propertyName]: selectedColor,
          };
          updateItem(currentItem.id, { labelStyle: updatedLabelStyle });
          emit("mymap-label-style-change", { id: currentItem.id, labelStyle: updatedLabelStyle });
        }
      }
    };

    // Hex input handler
    const hexInput = colorPicker.querySelector("#sc-sym-picker-hex") as HTMLInputElement;
    const rInput = colorPicker.querySelector("#sc-sym-picker-r") as HTMLInputElement;
    const gInput = colorPicker.querySelector("#sc-sym-picker-g") as HTMLInputElement;
    const bInput = colorPicker.querySelector("#sc-sym-picker-b") as HTMLInputElement;

    if (hexInput) {
      hexInput.addEventListener("input", () => {
        let val = hexInput.value;
        if (!val.startsWith("#")) val = "#" + val;
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(val)) {
          const rgb = hexToRgbObject(val);
          if (rInput) rInput.value = rgb.r.toString();
          if (gInput) gInput.value = rgb.g.toString();
          if (bInput) bInput.value = rgb.b.toString();
          applyColorSelection(val);
        }
      });
      hexInput.addEventListener("focus", (e) => e.stopPropagation());
      hexInput.addEventListener("click", (e) => e.stopPropagation());
    }

    const updateFromRGB = () => {
      const r = Math.max(0, Math.min(255, parseInt(rInput?.value) || 0));
      const g = Math.max(0, Math.min(255, parseInt(gInput?.value) || 0));
      const b = Math.max(0, Math.min(255, parseInt(bInput?.value) || 0));
      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
      if (hexInput) hexInput.value = hex;
      applyColorSelection(hex);
    };

    [rInput, gInput, bInput].forEach((input) => {
      if (input) {
        input.addEventListener("input", updateFromRGB);
        input.addEventListener("focus", (e) => e.stopPropagation());
        input.addEventListener("click", (e) => e.stopPropagation());
      }
    });

    // Add click listeners to color swatches
    const swatches = colorPicker.querySelectorAll(".color-swatch");
    swatches.forEach((swatch) => {
      swatch.addEventListener("click", (colorEvent: Event) => {
        const selectedColor = (colorEvent.target as HTMLElement).getAttribute("data-color");
        if (selectedColor) {
          // Update hex/RGB inputs
          const rgb = hexToRgbObject(selectedColor);
          if (hexInput) hexInput.value = selectedColor.toUpperCase();
          if (rInput) rInput.value = rgb.r.toString();
          if (gInput) gInput.value = rgb.g.toString();
          if (bInput) bInput.value = rgb.b.toString();
          applyColorSelection(selectedColor);
        }
        colorPicker.remove();
      });
    });

    // Position picker near the button
    const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
    colorPicker.style.left = `${buttonRect.left}px`;
    colorPicker.style.top = `${buttonRect.bottom + 5}px`;

    // Add to page
    document.body.appendChild(colorPicker);

    // Close picker when clicking outside
    const handleOutsideClick = (outsideEvent: MouseEvent) => {
      if (!colorPicker.contains(outsideEvent.target as Node)) {
        colorPicker.remove();
        document.removeEventListener("click", handleOutsideClick);
      }
    };

    // Delay adding the outside click listener to prevent immediate closure
    setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 100);
  };

  // Re-attach symbolizer component event listeners (React handlers are lost when copying HTML to overlay)
  const symbolizerContainer = container.querySelector(".mymaps-symbolizer-container");
  if (symbolizerContainer) {

    // 🎯 Get current state once at the top for all controls to use
    const currentState = getCurrentSymbolizerState();
    if (!currentState) {
      console.warn("⚠️ Could not get current symbolizer state");
      return;
    }

    // Point style dropdown
    const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
    if (pointStyleSelect) {
      // 🎯 CRITICAL: Set dropdown value from current state before attaching events
      const currentPointType = item.pointType || currentState.pointType || "circle";
      pointStyleSelect.value = currentPointType;

      pointStyleSelect.addEventListener("change", (e) => {
        e.stopPropagation();
        const newPointType = (e.target as HTMLSelectElement).value;

        // Update the item's point type and style
        updateSymbolizerPointType(item.id, newPointType);
      });
      (pointStyleSelect as HTMLElement).style.pointerEvents = "auto";
    }

    // Stroke type dropdown
    const strokeTypeSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
    if (strokeTypeSelect) {
      // 🎯 Set stroke type dropdown value from current state
      const currentStrokeType = item.strokeType || currentState.strokeType || "normal";
      strokeTypeSelect.value = currentStrokeType;

      strokeTypeSelect.addEventListener("change", (e) => {
        e.stopPropagation();
        const newStrokeType = (e.target as HTMLSelectElement).value;

        // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
        const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
        const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

        // Get current state from store/item (not DOM)
        const state = getCurrentSymbolizerState();
        if (!state) return;

        // Read all slider values from DOM using data-slider-type attributes
        const sliderVals = readAllSliderValues(symbolizerContainer, state);

        // Read current colors from DOM color buttons
        const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
        const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

        if (item?.id) {
          // Create style - EXPLICIT GEOMETRY TYPE CHECKING like old app
          let style = null;
          if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
            style = getPointStyle(
              currentPointType,
              sliderVals.radius,
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
              sliderVals.strokeWidth,
              [currentFillColor.r, currentFillColor.g, currentFillColor.b, sliderVals.fillAlpha],
              sliderVals.rotation,
              newStrokeType, // Use the new stroke type
            );
          } else if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
            style = getLineStringStyle(
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
              sliderVals.strokeWidth,
              newStrokeType, // Use the new stroke type
            );
          } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
            style = getPolygonStyle(
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
              sliderVals.strokeWidth,
              [currentFillColor.r, currentFillColor.g, currentFillColor.b, sliderVals.fillAlpha],
              newStrokeType, // Use the new stroke type
            );
          }

          // Only update if style was created successfully
          if (style) {
            const updates = {
              style: style,
              pointType: currentPointType,
              strokeType: newStrokeType, // Update stroke type
            };
            updateItem(item.id, updates);

            // Emit event to refresh the feature on the map
            emit("mymap-style-updated", { itemId: item.id, style, strokeType: newStrokeType });
          }
        }
      });
      (strokeTypeSelect as HTMLElement).style.pointerEvents = "auto";
    }

    // Size/Radius slider (first range input)
    const sizeSlider = symbolizerContainer.querySelector("input[type='range']:nth-of-type(1)") as HTMLInputElement;
    if (sizeSlider) {
      // 🎯 Set slider value from current state
      sizeSlider.value = currentState.radius.toString();
      const handleSizeChange = (e: Event) => {
        e.stopPropagation();
        const newRadius = parseFloat((e.target as HTMLInputElement).value);

        // CRITICAL FIX: Get ALL current values from DOM to preserve all current settings
        const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
        const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

        const strokeStyleSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
        const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

        // Get current state from store/item (not DOM)
        const state = getCurrentSymbolizerState();
        if (!state) return;

        // Read all slider values from DOM using data-slider-type attributes
        const sliderVals = readAllSliderValues(symbolizerContainer, state);

        // Read current colors from DOM color buttons
        const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
        const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

        if (item?.id) {
          // Create style with ALL current DOM values
          const style = createPointStyleFromHelpers(
            currentPointType,
            newRadius, // Use the new radius value
            [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
            sliderVals.strokeWidth,
            [currentFillColor.r, currentFillColor.g, currentFillColor.b, sliderVals.fillAlpha],
            sliderVals.rotation,
            currentStrokeType,
          );

          // Update the item in the store
          const updates = {
            style: style,
            pointType: currentPointType,
            strokeType: currentStrokeType,
          };
          updateItem(item.id, updates);

          // Emit event to refresh the feature on the map
          emit("mymap-style-updated", { itemId: item.id, style, radius: newRadius });
        }
      };

      sizeSlider.addEventListener("input", handleSizeChange);
      sizeSlider.addEventListener("change", handleSizeChange);
      (sizeSlider as HTMLElement).style.pointerEvents = "auto";

      // Prevent slider from interfering with header drag
      sizeSlider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    // Fill opacity slider - use data-slider-type attribute
    const fillOpacitySlider = symbolizerContainer.querySelector("input[data-slider-type='fill-opacity']") as HTMLInputElement | null;
    if (fillOpacitySlider) {
      // 🎯 Set fill opacity slider value from current state
      fillOpacitySlider.value = currentState.fillAlpha.toString();

      const handleFillOpacityChange = (e: Event) => {
        e.stopPropagation();
        const newOpacity = parseFloat((e.target as HTMLInputElement).value);
        if (item?.id) {
          updateSymbolizerFillOpacity(item.id, newOpacity);
        }
      };

      fillOpacitySlider.addEventListener("input", handleFillOpacityChange);
      fillOpacitySlider.addEventListener("change", handleFillOpacityChange);
      (fillOpacitySlider as HTMLElement).style.pointerEvents = "auto";

      // Prevent slider from interfering with header drag
      fillOpacitySlider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    // Stroke opacity slider - use data-slider-type attribute
    const strokeOpacitySlider = symbolizerContainer.querySelector("input[data-slider-type='stroke-opacity']") as HTMLInputElement | null;
    if (strokeOpacitySlider) {
      // 🎯 Set stroke opacity slider value from current state
      strokeOpacitySlider.value = currentState.strokeAlpha.toString();

      const handleStrokeOpacityChange = (e: Event) => {
        e.stopPropagation();
        const newOpacity = parseFloat((e.target as HTMLInputElement).value);
        if (item?.id) {
          updateSymbolizerStrokeOpacity(item.id, newOpacity);
        }
      };

      strokeOpacitySlider.addEventListener("input", handleStrokeOpacityChange);
      strokeOpacitySlider.addEventListener("change", handleStrokeOpacityChange);
      (strokeOpacitySlider as HTMLElement).style.pointerEvents = "auto";

      // Prevent slider from interfering with header drag
      strokeOpacitySlider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    // Stroke Width slider - use data-slider-type attribute
    const strokeWidthSlider = symbolizerContainer.querySelector("input[data-slider-type='stroke-width']") as HTMLInputElement | null;
    if (strokeWidthSlider) {
      // Set stroke width slider value from current state
      strokeWidthSlider.value = currentState.strokeWidth.toString();

      const handleStrokeWidthChange = (e: Event) => {
        e.stopPropagation();
        const newStrokeWidth = parseFloat((e.target as HTMLInputElement).value);

        // Get current state from store/item (not DOM)
        const state = getCurrentSymbolizerState();
        if (!state) return;

        // Read all current values from DOM using data-slider-type attributes
        const sliderVals = readAllSliderValues(symbolizerContainer, state);
        let currentPointType = state.pointType;
        let currentStrokeType = state.strokeType;

        // Read dropdown values
        if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
          const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
          currentPointType = pointStyleSelect ? pointStyleSelect.value : currentPointType;
        }

        const strokeStyleSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
        currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : currentStrokeType;

        // Read current colors from DOM color buttons
        const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
        const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

        if (item?.id) {
          // Create style - EXPLICIT GEOMETRY TYPE CHECKING like old app
          let style = null;
          if (item?.geometryType === "Point" || item?.geometryType === "MultiPoint") {
            style = getPointStyle(
              currentPointType,
              sliderVals.radius,
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
              newStrokeWidth, // Use the new stroke width
              [currentFillColor.r, currentFillColor.g, currentFillColor.b, sliderVals.fillAlpha],
              sliderVals.rotation,
              currentStrokeType,
            );
          } else if (item?.geometryType === "LineString" || item?.geometryType === "MultiLineString") {
            style = getLineStringStyle(
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
              newStrokeWidth, // Use the new stroke width
              currentStrokeType,
            );
          } else if (item?.geometryType === "Polygon" || item?.geometryType === "MultiPolygon") {
            style = getPolygonStyle(
              [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
              newStrokeWidth, // Use the new stroke width
              [currentFillColor.r, currentFillColor.g, currentFillColor.b, sliderVals.fillAlpha],
              currentStrokeType,
            );
          }

          // Only update if style was created successfully
          if (style) {
            const updates = {
              style: style,
              pointType: currentPointType,
              strokeType: currentStrokeType,
            };
            updateItem(item.id, updates);

            // Emit event to refresh the feature on the map
            emit("mymap-style-updated", { itemId: item.id, style, strokeWidth: newStrokeWidth });
          }
        }
      };

      strokeWidthSlider.addEventListener("input", handleStrokeWidthChange);
      strokeWidthSlider.addEventListener("change", handleStrokeWidthChange);
      (strokeWidthSlider as HTMLElement).style.pointerEvents = "auto";

      // Prevent slider from interfering with header drag
      strokeWidthSlider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    // Rotation/Angle slider - find by data-slider-type attribute
    const rotationSlider = symbolizerContainer.querySelector("input[data-slider-type='rotation']") as HTMLInputElement;
    if (rotationSlider) {
      // Set rotation slider value from current state
      rotationSlider.value = currentState.rotation.toString();

      const handleRotationChange = (e: Event) => {
        e.stopPropagation();
        const newRotation = parseFloat((e.target as HTMLInputElement).value);

        // Get current state from store/item (not DOM)
        const state = getCurrentSymbolizerState();
        if (!state) return;

        // Read all current values from DOM using data-slider-type attributes
        const sliderVals = readAllSliderValues(symbolizerContainer, state);

        // Read dropdown values
        const pointStyleSelect = symbolizerContainer.querySelector("select[name='pointSymbols']") as HTMLSelectElement;
        const currentPointType = pointStyleSelect ? pointStyleSelect.value : item.pointType || "circle";

        const strokeStyleSelect = symbolizerContainer.querySelector("select[name='pointOutline']") as HTMLSelectElement;
        const currentStrokeType = strokeStyleSelect ? strokeStyleSelect.value : item.strokeType || "normal";

        // Read current colors from DOM color buttons
        const currentFillColor = extractColorFromDOMButton("sc-mymaps-symbolizer-color-button");
        const currentStrokeColor = extractColorFromDOMButton("sc-mymaps-symbolizer-stroke-color-button");

        if (item?.id) {
          // Create style with ALL current DOM values and new rotation
          const style = createPointStyleFromHelpers(
            currentPointType,
            sliderVals.radius,
            [currentStrokeColor.r, currentStrokeColor.g, currentStrokeColor.b, sliderVals.strokeAlpha],
            sliderVals.strokeWidth,
            [currentFillColor.r, currentFillColor.g, currentFillColor.b, sliderVals.fillAlpha],
            newRotation, // Use the new rotation
            currentStrokeType,
          );

          // Update the item in the store
          const updates = {
            style: style,
            pointType: currentPointType,
            strokeType: currentStrokeType,
          };
          updateItem(item.id, updates);

          // Emit event to refresh the feature on the map
          emit("mymap-style-updated", { itemId: item.id, style, rotation: newRotation });
        }
      };

      rotationSlider.addEventListener("input", handleRotationChange);
      rotationSlider.addEventListener("change", handleRotationChange);
      (rotationSlider as HTMLElement).style.pointerEvents = "auto";

      // Prevent slider from interfering with header drag
      rotationSlider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    // Fill color picker button
    const fillColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-color-button") as HTMLButtonElement;
    if (fillColorButton) {
      // 🎯 Set fill color button background to reflect current state
      const currentFillColor = currentState.fillColor;
      const fillColorHex = `rgb(${currentFillColor.r}, ${currentFillColor.g}, ${currentFillColor.b})`;
      fillColorButton.style.backgroundColor = fillColorHex;

      const handleFillColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "fill");
      };

      fillColorButton.addEventListener("click", handleFillColorClick);
      fillColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (fillColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Stroke color picker button
    const strokeColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-stroke-color-button") as HTMLButtonElement;
    if (strokeColorButton) {
      // 🎯 Set stroke color button background to reflect current state
      const currentStrokeColor = currentState.strokeColor;
      const strokeColorHex = `rgb(${currentStrokeColor.r}, ${currentStrokeColor.g}, ${currentStrokeColor.b})`;
      strokeColorButton.style.backgroundColor = strokeColorHex;

      const handleStrokeColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "stroke");
      };

      strokeColorButton.addEventListener("click", handleStrokeColorClick);
      strokeColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (strokeColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Text color picker button
    const textColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-text-color-button") as HTMLButtonElement;
    if (textColorButton) {
      const handleTextColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "textColor");
      };

      textColorButton.addEventListener("click", handleTextColorClick);
      textColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (textColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Label outline color picker button
    const labelOutlineColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-label-outline-color-button") as HTMLButtonElement;
    if (labelOutlineColorButton) {
      const handleLabelOutlineColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "labelOutlineColor");
      };

      labelOutlineColorButton.addEventListener("click", handleLabelOutlineColorClick);
      labelOutlineColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (labelOutlineColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Font size dropdown (for label text size)
    // Prefer explicit selector for stability, then fall back to legacy class detection.
    const explicitFontSizeSelect = symbolizerContainer.querySelector("select[name='labelFontSize']") as HTMLSelectElement | null;
    const fontSizeDropdowns = explicitFontSizeSelect ? [explicitFontSizeSelect] : (Array.from(symbolizerContainer.querySelectorAll(".sc-mymaps-style-dropdown")) as HTMLSelectElement[]);

    fontSizeDropdowns.forEach((selectElement) => {
      // When falling back to class-based discovery, verify this dropdown contains px values.
      const options = Array.from(selectElement.options);
      const isFontSizeDropdown = !!explicitFontSizeSelect || options.some((opt) => opt.value.includes("px") && !opt.value.includes("Normal") && !opt.value.includes("Dashed"));

      if (isFontSizeDropdown) {
        // React sets <select value> via the DOM `.value` property, not the `selected`
        // attribute on options. When the popup's HTML is copied to the overlay element
        // via innerHTML, that property is lost and the select falls back to its first
        // option. Re-hydrate the value from the store's label style so the dropdown
        // reflects the feature's actual font size on open.
        const defaultLabelStyle = getDefaultLabelStyle();
        const mergedLabelStyle = {
          ...defaultLabelStyle,
          ...((item.labelStyle as Record<string, unknown>) || {}),
        } as Record<string, unknown>;
        const currentFontSize = typeof mergedLabelStyle.textSize === "string" ? mergedLabelStyle.textSize : String(defaultLabelStyle.textSize ?? "14px");

        const hasMatchingOption = options.some((opt) => opt.value === currentFontSize);
        if (!hasMatchingOption && /^\d+(\.\d+)?px$/i.test(currentFontSize)) {
          // Ensure the current size is selectable even if it isn't in the base list.
          const newOption = document.createElement("option");
          newOption.value = currentFontSize;
          newOption.textContent = currentFontSize;
          selectElement.appendChild(newOption);
        }
        selectElement.value = currentFontSize;

        const handleFontSizeChange = (e: Event) => {
          e.stopPropagation();
          const newFontSize = (e.target as HTMLSelectElement).value;

          // Get the CURRENT item from store to avoid stale closure issues
          const currentItems = useMyMapsStore.getState().items;
          const currentItem = currentItems.find((i) => i.id === item?.id);
          if (!currentItem) return;

          // Get current labelStyle from CURRENT item (not stale closure), merged with defaults
          const defaultLabelStyle = getDefaultLabelStyle();
          const currentLabelStyle = {
            ...defaultLabelStyle,
            ...((currentItem.labelStyle as Record<string, unknown>) || {}),
          };

          const updatedLabelStyle = {
            ...currentLabelStyle,
            textSize: newFontSize,
          };
          updateItem(currentItem.id, { labelStyle: updatedLabelStyle });
          emit("mymap-label-style-change", { id: currentItem.id, labelStyle: updatedLabelStyle });
        };

        selectElement.addEventListener("change", handleFontSizeChange);
        selectElement.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
        (selectElement as HTMLElement).style.pointerEvents = "auto";
      }
    });

    // Label outline width slider
    // The label outline width slider is in the label style section - find sliders within the symbolizer
    // that are NOT the main style sliders (size, fill opacity, stroke opacity, stroke width, rotation)
    const labelSliders = symbolizerContainer.querySelectorAll("input[type='range']") as NodeListOf<HTMLInputElement>;
    // The label outline width slider has max=4 and step=0.5, which distinguishes it from other sliders
    labelSliders.forEach((slider) => {
      const max = parseFloat(slider.getAttribute("max") || "100");
      const step = slider.getAttribute("step");

      // Label outline width slider has max=4 and step=0.5
      if (max === 4 && step === "0.5") {
        const handleLabelOutlineWidthChange = (e: Event) => {
          e.stopPropagation();
          const newOutlineWidth = parseFloat((e.target as HTMLInputElement).value);

          // Get the CURRENT item from store to avoid stale closure issues
          const currentItems = useMyMapsStore.getState().items;
          const currentItem = currentItems.find((i) => i.id === item?.id);
          if (!currentItem) return;

          // Get current labelStyle from CURRENT item (not stale closure), merged with defaults
          const defaultLabelStyle = getDefaultLabelStyle();
          const currentLabelStyle = {
            ...defaultLabelStyle,
            ...((currentItem.labelStyle as Record<string, unknown>) || {}),
          };

          const updatedLabelStyle = {
            ...currentLabelStyle,
            outlineWidth: newOutlineWidth,
          };
          updateItem(currentItem.id, { labelStyle: updatedLabelStyle });
          emit("mymap-label-style-change", { id: currentItem.id, labelStyle: updatedLabelStyle });
        };

        slider.addEventListener("input", handleLabelOutlineWidthChange);
        slider.addEventListener("change", handleLabelOutlineWidthChange);
        slider.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
        (slider as HTMLElement).style.pointerEvents = "auto";
      }
    });

    // Callout background color picker button
    const calloutBackgroundColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-callout-background-color-button") as HTMLButtonElement;
    if (calloutBackgroundColorButton) {
      const handleCalloutBackgroundColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "backgroundColor");
      };

      calloutBackgroundColorButton.addEventListener("click", handleCalloutBackgroundColorClick);
      calloutBackgroundColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (calloutBackgroundColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Callout border color picker button
    const calloutBorderColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-callout-border-color-button") as HTMLButtonElement;
    if (calloutBorderColorButton) {
      const handleCalloutBorderColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "borderColor");
      };

      calloutBorderColorButton.addEventListener("click", handleCalloutBorderColorClick);
      calloutBorderColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (calloutBorderColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Callout line color picker button
    const calloutLineColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-callout-line-color-button") as HTMLButtonElement;
    if (calloutLineColorButton) {
      const handleCalloutLineColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "lineColor");
      };

      calloutLineColorButton.addEventListener("click", handleCalloutLineColorClick);
      calloutLineColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (calloutLineColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // Callout anchor color picker button
    const calloutAnchorColorButton = symbolizerContainer.querySelector("#sc-mymaps-symbolizer-callout-anchor-color-button") as HTMLButtonElement;
    if (calloutAnchorColorButton) {
      const handleCalloutAnchorColorClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        showSymbolizerColorPicker(e as MouseEvent, "anchorColor");
      };

      calloutAnchorColorButton.addEventListener("click", handleCalloutAnchorColorClick);
      calloutAnchorColorButton.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      (calloutAnchorColorButton as HTMLElement).style.pointerEvents = "auto";
    }

    // The container itself should NOT have pointerEvents = "auto" to avoid header conflicts
    (symbolizerContainer as HTMLElement).style.pointerEvents = "";
  }
};

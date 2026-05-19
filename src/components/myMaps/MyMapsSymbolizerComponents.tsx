"use client";

import React from "react";
import "@/components/myMaps/MyMapsSymbolizer.css";

// ============================================
// POINT & SHAPE COMPONENTS
// ============================================

interface PointTypeProps {
  visible: boolean;
  selectedPointStyleDropDown: string;
  onPointStyleDropDown: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const PointType: React.FC<PointTypeProps> = ({ visible, selectedPointStyleDropDown, onPointStyleDropDown }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Style:</label>
      <select
        className="col-start-3 col-end-5 p-[2px] border border-base-300 rounded-[3px] text-[9pt] outline-none w-full box-border focus:border-primary"
        name="pointSymbols"
        value={selectedPointStyleDropDown}
        onChange={onPointStyleDropDown}
      >
        <option value="circle">Circle</option>
        <option value="cross">Cross</option>
        <option value="square">Square</option>
        <option value="triangle">Triangle</option>
        <option value="star">Star</option>
        <option value="x">X</option>
      </select>
    </>
  );
};

interface PolygonTypeProps {
  visible: boolean;
  selectedPolygonStyleDropDown: string;
  onPolygonStyleDropDown: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const PolygonType: React.FC<PolygonTypeProps> = ({ visible, selectedPolygonStyleDropDown, onPolygonStyleDropDown }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Style:</label>
      <select
        className="col-start-3 col-end-5 p-[2px] border border-base-300 rounded-[3px] text-[9pt] outline-none w-full box-border focus:border-primary"
        name="polygonSymbols"
        value={selectedPolygonStyleDropDown}
        onChange={onPolygonStyleDropDown}
      >
        <option value="none">None</option>
        <option value="solid">Solid</option>
        <option value="horizontal">Horizontal</option>
        <option value="vertical">Vertical</option>
        <option value="cross">Cross</option>
      </select>
    </>
  );
};

interface StyleSizeProps {
  visible: boolean;
  sliderRadiusMin: number;
  sliderRadiusMax: number;
  radius: number;
  onRadiusSliderChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StyleSize: React.FC<StyleSizeProps> = ({ visible, sliderRadiusMin, sliderRadiusMax, radius, onRadiusSliderChange }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Size:</label>
      <div className="mymaps-symbolizer-slider col-start-3 col-end-5 self-center w-full min-w-0 text-[7pt]">
        <input type="range" data-slider-type="size" className="w-full" min={sliderRadiusMin} max={sliderRadiusMax} value={radius} step="1" onChange={onRadiusSliderChange} />
      </div>
    </>
  );
};

// ============================================
// FILL & COLOR COMPONENTS
// ============================================

interface FillColorProps {
  visible: boolean;
  isPolygon: boolean;
  rgbFill: string;
  fillAlpha: number;
  sliderFillOpacityMin: number;
  sliderFillOpacityMax: number;
  onFillColorPickerButton: (evt: React.MouseEvent) => void;
  onFillOpacitySliderChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FillColor: React.FC<FillColorProps> = ({ visible, isPolygon, rgbFill, fillAlpha, sliderFillOpacityMin, sliderFillOpacityMax, onFillColorPickerButton, onFillOpacitySliderChange }) => {
  if (!visible) return null;

  return (
    <>
      <label
        className={
          isPolygon
            ? "col-start-1 col-end-3 self-center font-bold text-[11px] font-[Arial,sans-serif] text-base-content"
            : "col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content"
        }
      >
        Color:
      </label>
      <div className="col-start-3 col-end-5 inline-flex items-center min-w-0">
        <button
          id="sc-mymaps-symbolizer-color-button"
          type="button"
          className="shrink-0"
          style={{
            backgroundColor: rgbFill,
            width: "30px",
            height: "15px",
            cursor: "pointer",
            border: "1px solid #cecece",
            borderRadius: "3px",
          }}
          onMouseUp={onFillColorPickerButton}
        />
        <div className="mymaps-symbolizer-slider ml-2 text-[7pt] min-w-0 flex-1">
          <input
            type="range"
            data-slider-type="fill-opacity"
            className="w-full"
            min={sliderFillOpacityMin}
            max={sliderFillOpacityMax}
            value={fillAlpha}
            step="0.05"
            onChange={onFillOpacitySliderChange}
          />
        </div>
      </div>
    </>
  );
};

// ============================================
// STROKE COMPONENTS
// ============================================

interface StrokeTypeProps {
  visible?: boolean;
  selectedStrokeTypeDropDown: string;
  onStrokeTypeDropDown: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const StrokeType: React.FC<StrokeTypeProps> = ({ visible = true, selectedStrokeTypeDropDown, onStrokeTypeDropDown }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Outline:</label>
      <select
        className="col-start-3 col-end-5 p-[2px] border border-base-300 rounded-[3px] text-[9pt] outline-none w-full box-border focus:border-primary"
        name="pointOutline"
        value={selectedStrokeTypeDropDown}
        onChange={onStrokeTypeDropDown}
      >
        <option value="normal">Normal</option>
        <option value="dash">Dash</option>
        <option value="dot">Dot</option>
      </select>
    </>
  );
};

interface StrokeColorProps {
  visible?: boolean;
  rgbStroke: string;
  strokeAlpha: number;
  sliderStrokeOpacityMin: number;
  sliderStrokeOpacityMax: number;
  onStrokeColorPickerButton: (evt: React.MouseEvent) => void;
  onStrokeOpacitySliderChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StrokeColor: React.FC<StrokeColorProps> = ({
  visible = true,
  rgbStroke,
  strokeAlpha,
  sliderStrokeOpacityMin,
  sliderStrokeOpacityMax,
  onStrokeColorPickerButton,
  onStrokeOpacitySliderChange,
}) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Color:</label>
      <div className="col-start-3 col-end-5 inline-flex items-center min-w-0">
        <button
          id="sc-mymaps-symbolizer-stroke-color-button"
          type="button"
          className="shrink-0"
          style={{
            backgroundColor: rgbStroke,
            width: "30px",
            height: "15px",
            cursor: "pointer",
            border: "1px solid #cecece",
            borderRadius: "3px",
          }}
          onMouseUp={onStrokeColorPickerButton}
        />
        <div className="mymaps-symbolizer-slider ml-2 text-[7pt] min-w-0 flex-1">
          <input
            type="range"
            data-slider-type="stroke-opacity"
            className="w-full"
            min={sliderStrokeOpacityMin}
            max={sliderStrokeOpacityMax}
            value={strokeAlpha}
            step="0.05"
            onChange={onStrokeOpacitySliderChange}
          />
        </div>
      </div>
    </>
  );
};

interface StrokeWidthProps {
  visible?: boolean;
  strokeWidth: number;
  sliderStrokeWidthMin: number;
  sliderStrokeWidthMax: number;
  onStrokeWidthSliderChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StrokeWidth: React.FC<StrokeWidthProps> = ({ visible = true, strokeWidth, sliderStrokeWidthMin, sliderStrokeWidthMax, onStrokeWidthSliderChange }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Width:</label>
      <div className="mymaps-symbolizer-slider col-start-3 col-end-5 self-center w-full min-w-0 text-[7pt]">
        <input
          type="range"
          data-slider-type="stroke-width"
          className="w-full"
          min={sliderStrokeWidthMin}
          max={sliderStrokeWidthMax}
          value={strokeWidth}
          step="0.5"
          onChange={onStrokeWidthSliderChange}
        />
      </div>
    </>
  );
};

// ============================================
// ROTATION COMPONENT
// ============================================

interface RotationProps {
  visible: boolean;
  rotation: number;
  sliderRotationMin: number;
  sliderRotationMax: number;
  onRotationSliderChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Rotation: React.FC<RotationProps> = ({ visible, rotation, sliderRotationMin, sliderRotationMax, onRotationSliderChange }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Angle:</label>
      <div className="col-start-3 col-end-5 self-center">
        <div className="mymaps-symbolizer-slider col-start-2 col-end-5 w-full text-[7pt]">
          <input type="range" data-slider-type="rotation" min={sliderRotationMin} max={sliderRotationMax} value={rotation} step="0.1" onChange={onRotationSliderChange} />
        </div>
      </div>
    </>
  );
};

// ============================================
// LABEL STYLE COMPONENTS
// ============================================

interface LabelTextColorProps {
  visible: boolean;
  textColor: string;
  onTextColorPickerButton: (evt: React.MouseEvent) => void;
}

export const LabelTextColor: React.FC<LabelTextColorProps> = ({ visible, textColor, onTextColorPickerButton }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Text Color:</label>
      <div className="col-start-3 col-end-5 inline-flex items-center">
        <button
          id="sc-mymaps-symbolizer-text-color-button"
          type="button"
          style={{
            backgroundColor: textColor,
            width: "30px",
            height: "15px",
            cursor: "pointer",
            border: "1px solid #cecece",
            borderRadius: "3px",
          }}
          onClick={onTextColorPickerButton}
        />
      </div>
    </>
  );
};

interface LabelFontSizeProps {
  visible: boolean;
  fontSize: string;
  onFontSizeChange: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const LabelFontSize: React.FC<LabelFontSizeProps> = ({ visible, fontSize, onFontSizeChange }) => {
  if (!visible) return null;

  const baseFontSizes = ["10px", "12px", "14px", "15px", "16px", "18px", "20px", "24px"];
  const isValidPxValue = /^\d+(\.\d+)?px$/i.test(fontSize);
  const fontSizeOptions = isValidPxValue && !baseFontSizes.includes(fontSize) ? [...baseFontSizes, fontSize].sort((a, b) => parseFloat(a) - parseFloat(b)) : baseFontSizes;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Font Size:</label>
      <select
        className="sc-mymaps-style-dropdown col-start-3 col-end-5 p-[2px] border border-base-300 rounded-[3px] text-[9pt] outline-none w-full box-border focus:border-primary"
        name="labelFontSize"
        value={fontSize}
        onChange={onFontSizeChange}
      >
        {fontSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </>
  );
};

interface LabelOutlineColorProps {
  visible: boolean;
  outlineColor: string;
  onOutlineColorPickerButton: (evt: React.MouseEvent) => void;
}

export const LabelOutlineColor: React.FC<LabelOutlineColorProps> = ({ visible, outlineColor, onOutlineColorPickerButton }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Outline Color:</label>
      <div className="col-start-3 col-end-5 inline-flex items-center">
        <button
          id="sc-mymaps-symbolizer-label-outline-color-button"
          type="button"
          style={{
            backgroundColor: outlineColor,
            width: "30px",
            height: "15px",
            cursor: "pointer",
            border: "1px solid #cecece",
            borderRadius: "3px",
          }}
          onClick={onOutlineColorPickerButton}
        />
      </div>
    </>
  );
};

interface LabelOutlineWidthProps {
  visible: boolean;
  outlineWidth: number;
  onOutlineWidthChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LabelOutlineWidth: React.FC<LabelOutlineWidthProps> = ({ visible, outlineWidth, onOutlineWidthChange }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">Outline Width:</label>
      <div className="mymaps-symbolizer-slider col-start-3 col-end-5 self-center w-full min-w-0 text-[7pt]">
        <input type="range" data-slider-type="label-outline-width" className="w-full" min={0} max={4} value={outlineWidth} step="0.5" onChange={onOutlineWidthChange} />
      </div>
    </>
  );
};

// ============================================
// CALLOUT-SPECIFIC COMPONENTS
// ============================================

interface CalloutColorButtonProps {
  visible: boolean;
  label: string;
  color: string;
  buttonId: string;
  onColorPickerButton: (evt: React.MouseEvent) => void;
}

const CalloutColorButton: React.FC<CalloutColorButtonProps> = ({ visible, label, color, buttonId, onColorPickerButton }) => {
  if (!visible) return null;

  return (
    <>
      <label className="col-start-1 col-end-3 self-center mr-[5px] text-right font-bold text-[11px] font-[Arial,sans-serif] text-base-content">{label}:</label>
      <div className="col-start-3 col-end-5 inline-flex items-center">
        <button
          id={buttonId}
          type="button"
          style={{
            backgroundColor: color,
            width: "30px",
            height: "15px",
            cursor: "pointer",
            border: "1px solid #cecece",
            borderRadius: "3px",
          }}
          onClick={onColorPickerButton}
        />
      </div>
    </>
  );
};

interface CalloutBackgroundColorProps {
  visible: boolean;
  backgroundColor: string;
  onBackgroundColorPickerButton: (evt: React.MouseEvent) => void;
}

export const CalloutBackgroundColor: React.FC<CalloutBackgroundColorProps> = ({ visible, backgroundColor, onBackgroundColorPickerButton }) => {
  return (
    <CalloutColorButton
      visible={visible}
      label="Background"
      color={backgroundColor}
      buttonId="sc-mymaps-symbolizer-callout-background-color-button"
      onColorPickerButton={onBackgroundColorPickerButton}
    />
  );
};

interface CalloutBorderColorProps {
  visible: boolean;
  borderColor: string;
  onBorderColorPickerButton: (evt: React.MouseEvent) => void;
}

export const CalloutBorderColor: React.FC<CalloutBorderColorProps> = ({ visible, borderColor, onBorderColorPickerButton }) => {
  return <CalloutColorButton visible={visible} label="Border" color={borderColor} buttonId="sc-mymaps-symbolizer-callout-border-color-button" onColorPickerButton={onBorderColorPickerButton} />;
};

interface CalloutLineColorProps {
  visible: boolean;
  lineColor: string;
  onLineColorPickerButton: (evt: React.MouseEvent) => void;
}

export const CalloutLineColor: React.FC<CalloutLineColorProps> = ({ visible, lineColor, onLineColorPickerButton }) => {
  return <CalloutColorButton visible={visible} label="Line" color={lineColor} buttonId="sc-mymaps-symbolizer-callout-line-color-button" onColorPickerButton={onLineColorPickerButton} />;
};

interface CalloutAnchorColorProps {
  visible: boolean;
  anchorColor: string;
  onAnchorColorPickerButton: (evt: React.MouseEvent) => void;
}

export const CalloutAnchorColor: React.FC<CalloutAnchorColorProps> = ({ visible, anchorColor, onAnchorColorPickerButton }) => {
  return <CalloutColorButton visible={visible} label="Anchor" color={anchorColor} buttonId="sc-mymaps-symbolizer-callout-anchor-color-button" onColorPickerButton={onAnchorColorPickerButton} />;
};

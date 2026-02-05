"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface ColorPickerProps {
  /** Current color in hex format (e.g., "#FF0000") */
  color: string;
  /** Callback when color is selected */
  onColorChange: (hex: string) => void;
  /** Callback when picker is closed */
  onClose: () => void;
  /** Position to show the picker at */
  position: { x: number; y: number };
  /** Whether to show RGB input fields */
  showRGBInputs?: boolean;
}

// CompactPicker colors - exact layout from react-color
const COMPACT_COLORS = [
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

interface RGB {
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    const hex = clamped.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const isValidHex = (hex: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
};

/**
 * A compact color picker component that renders in a portal.
 * Matches the behavior of react-color's CompactPicker.
 */
const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange, onClose, position, showRGBInputs = true }) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [currentColor, setCurrentColor] = useState(color);
  const [rgb, setRgb] = useState<RGB>(hexToRgb(color));
  const [hexInput, setHexInput] = useState(color.toUpperCase());

  // Calculate position to keep picker in viewport
  const getAdjustedPosition = useCallback(() => {
    const pickerWidth = showRGBInputs ? 320 : 290;
    const pickerHeight = showRGBInputs ? 150 : 100;

    let left = position.x;
    let top = position.y;

    if (typeof window !== "undefined") {
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - 10;
      }
      if (top + pickerHeight > window.innerHeight) {
        top = window.innerHeight - pickerHeight - 10;
      }
      if (left < 10) left = 10;
      if (top < 10) top = 10;
    }

    return { left, top };
  }, [position, showRGBInputs]);

  const [adjustedPosition, setAdjustedPosition] = useState(getAdjustedPosition);

  useEffect(() => {
    setAdjustedPosition(getAdjustedPosition());
  }, [getAdjustedPosition]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use timeout to prevent immediate close on the click that opened the picker
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Update local state when prop changes
  useEffect(() => {
    setCurrentColor(color);
    setRgb(hexToRgb(color));
    setHexInput(color.toUpperCase());
  }, [color]);

  const handleSwatchClick = (swatchColor: string) => {
    setCurrentColor(swatchColor);
    setRgb(hexToRgb(swatchColor));
    setHexInput(swatchColor.toUpperCase());
    onColorChange(swatchColor);
    onClose();
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("#")) {
      value = "#" + value;
    }
    setHexInput(value.toUpperCase());

    if (isValidHex(value)) {
      const newRgb = hexToRgb(value);
      setRgb(newRgb);
      setCurrentColor(value);
      onColorChange(value);
    }
  };

  const handleRgbInputChange = (channel: "r" | "g" | "b", value: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newRgb = { ...rgb, [channel]: numValue };
    setRgb(newRgb);

    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexInput(newHex);
    setCurrentColor(newHex);
    onColorChange(newHex);
  };

  const pickerContent = (
    <div
      ref={pickerRef}
      style={{
        position: "fixed",
        zIndex: 99999,
        left: adjustedPosition.left,
        top: adjustedPosition.top,
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        fontFamily: "Arial, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Color swatches grid */}
      <div style={{ display: "flex", flexWrap: "wrap", width: "270px" }}>
        {COMPACT_COLORS.map((swatchColor) => (
          <div
            key={swatchColor}
            onClick={() => handleSwatchClick(swatchColor)}
            onMouseEnter={(e) => {
              (e.target as HTMLDivElement).style.border = "2px solid #333";
            }}
            onMouseLeave={(e) => {
              const isSelected = swatchColor.toLowerCase() === currentColor.toLowerCase();
              (e.target as HTMLDivElement).style.border = isSelected ? "2px solid #333" : "1px solid #ddd";
            }}
            style={{
              width: "17px",
              height: "17px",
              backgroundColor: swatchColor,
              margin: "1px",
              cursor: "pointer",
              border: swatchColor.toLowerCase() === currentColor.toLowerCase() ? "2px solid #333" : "1px solid #ddd",
              borderRadius: "2px",
              boxSizing: "border-box",
            }}
          />
        ))}
      </div>

      {/* RGB inputs section */}
      {showRGBInputs && (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "#666",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  backgroundColor: currentColor,
                  border: "1px solid #ddd",
                  borderRadius: "3px",
                }}
              />
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                style={{
                  width: "70px",
                  fontSize: "11px",
                  border: "1px solid #ddd",
                  borderRadius: "2px",
                  padding: "3px 5px",
                  fontWeight: "bold",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                R
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbInputChange("r", e.target.value)}
                  style={{
                    width: "45px",
                    fontSize: "11px",
                    border: "1px solid #ddd",
                    borderRadius: "2px",
                    padding: "3px 5px",
                    textAlign: "center",
                  }}
                />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                G
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbInputChange("g", e.target.value)}
                  style={{
                    width: "45px",
                    fontSize: "11px",
                    border: "1px solid #ddd",
                    borderRadius: "2px",
                    padding: "3px 5px",
                    textAlign: "center",
                  }}
                />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                B
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbInputChange("b", e.target.value)}
                  style={{
                    width: "45px",
                    fontSize: "11px",
                    border: "1px solid #ddd",
                    borderRadius: "2px",
                    padding: "3px 5px",
                    textAlign: "center",
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render in portal at body level
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(pickerContent, document.body);
};

export default ColorPicker;

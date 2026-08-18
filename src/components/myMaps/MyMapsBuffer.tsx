"use client";

import React, { useState, useRef, useEffect } from "react";
import { Feature } from "ol";
import { Style, Stroke, Fill } from "ol/style";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import "./MyMapsBuffer.css";
import AppImage from "@/components/shared/AppImage";
import { featureFromGeoJSON, featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import { bufferGeometry, convertToMeters } from "@/utils/openlayers/BufferHelpers";
import { MYMAPS_CONSTANTS } from "@/types/myMaps";
import { activateTab } from "@/utils/helpersUI";
import type { MyMapsItem } from "@/types/myMaps";

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
  const { emit, addListener, removeListener } = useEventStore();

  const [color, setColor] = useState<ColorRGB>({ r: 85, g: 243, b: 30, a: 1 });
  const [distance, setDistance] = useState<number>(0);
  const [units, setUnits] = useState<string>("meters");
  const [addMessageVisible, setAddMessageVisible] = useState<boolean>(false);

  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const layerIdRef = useRef<string | null>(null);
  const bufferFeatureRef = useRef<Feature | null>(null);

  // Create vector layer for buffer preview
  useEffect(() => {
    if (!map) return;

    // Create layer for buffer preview with specific ID for cleanup
    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
    });

    // Set a specific ID so global cleanup can find this layer
    vectorLayer.set("id", "buffer-preview-layer");
    vectorLayer.set("name", "Buffer Preview");

    const layerId = LayerManager.addLayer(vectorLayer, "Tools", "Buffer Preview", {
      index: 10,
      metadata: {
        isBufferPreview: true,
        isTool: true,
      },
    });

    vectorLayerRef.current = vectorLayer;
    layerIdRef.current = layerId;

    return () => {
      // Cleanup layer on unmount
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        layerIdRef.current = null;
      }
      vectorLayerRef.current = null;
    };
  }, [map]);

  // Cleanup when popup closes or component unmounts
  useEffect(() => {
    const cleanup = () => {
      if (vectorLayerRef.current) {
        // Clear features first
        const source = vectorLayerRef.current.getSource();
        if (source) {
          source.clear();
        }
      }
      // Note: Layer cleanup is handled by the useEffect cleanup above
      // No need to manually remove here as it will be done on unmount
      setAddMessageVisible(false);
    };

    // Listen for popup close events via event store
    const handlePopupClose = () => {
      cleanup();
    };

    // Add event listener for popup close - returns listener ID
    const listenerId = addListener("drawing-options-popup-close", handlePopupClose);

    // Cleanup on unmount
    return () => {
      removeListener(listenerId);
      cleanup();
    };
  }, [map, addListener, removeListener]);

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
        onPreviewBufferClick().catch((error) => {
          console.error("Error in color change buffer preview:", error);
        });
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
      onPreviewBufferClick().catch((error) => {
        console.error("Error in distance change buffer preview:", error);
      });
    }
  };

  // Handle units change
  const onUnitsChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    setUnits(evt.target.value);

    if (!isNaN(distance)) {
      onPreviewBufferClick().catch((error) => {
        console.error("Error in units change buffer preview:", error);
      });
    }
  };

  // Preview buffer on map
  const onPreviewBufferClick = async () => {
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

      // bufferGeometry is now async, so we await it
      await bufferGeometry(geometry, distanceMeters, (bufferedGeometry) => {
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

      // Add buffer feature directly to MyMaps store
      const bufferFeature = bufferFeatureRef.current;
      const featureStyle = bufferFeature.getStyle();
      const myMapsItem = createMyMapsItem(bufferFeature, "Buffer", label, featureStyle instanceof Style ? styleToJSON(featureStyle) : undefined);
      myMapsItem.featureGeoJSON = featureToGeoJSON(bufferFeature);
      useMyMapsStore.getState().addItem(myMapsItem);
      emit("mymap-item-created", { item: myMapsItem });

      // Hide the add message
      setAddMessageVisible(false);

      // Clear the buffer preview
      if (vectorLayerRef.current) {
        vectorLayerRef.current.getSource()!.clear();
      }

      // Activate the MyMaps tab to show the newly added buffer
      activateTab("mymaps");
    }
  };

  if (!visible) {
    return <div className="hidden" />;
  }

  const rgbColor = `rgb(${color.r},${color.g},${color.b})`;

  return (
    <fieldset className="sc-mymaps-buffer-container border border-base-300 rounded-[3px] p-2 mb-[5px] bg-base-200 w-full box-border m-0">
      <legend className="text-sm font-bold text-base-content py-[2px] px-1.5 bg-base-200 border border-base-300 rounded-[3px] flex items-center">
        <AppImage src="/images/buffer.png" alt="buffer" className="w-4 h-4 block" />
        &nbsp; Buffer
      </legend>
      <div className="buffer-grid">
        <label style={{ gridColumnStart: "1" }}>Distance:</label>
        <label style={{ gridColumnStart: "2" }}>Units:</label>

        <input type="number" className="bg-base-100 text-primary" value={distance} onChange={onDistanceChange} style={{ gridColumnStart: "1", gridRowStart: "2" }} />

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
          className="w-full h-[23px] border border-base-300 rounded-[3px] cursor-pointer my-[3px] box-border hover:border-primary"
          title="Change Buffer Color"
          onClick={onColorPickerButton}
          style={{
            gridColumnStart: "1",
            gridRowStart: "3",
            backgroundColor: rgbColor,
          }}
        />

        <label
          className={addMessageVisible ? "text-primary cursor-pointer underline text-[11px] hover:no-underline" : "hidden"}
          style={{
            gridColumn: "1 / 3",
            gridRowStart: "4",
            textAlign: "center" as React.CSSProperties["textAlign"],
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

// ---------------------------------------------------------------------------
// DOM event wiring for the overlay-copied buffer markup.
//
// DrawingOptionsPopup copies its React-rendered markup into the OpenLayers
// overlay element via innerHTML, which strips React event handlers. This helper
// re-attaches the buffer tool's event listeners directly to the overlay DOM,
// drives the buffer preview layer, and wires the color picker + "add to MyMaps"
// link.
// ---------------------------------------------------------------------------
export const attachBufferListeners = (container: HTMLElement, item: MyMapsItem): void => {
  // Helper functions for buffer component DOM interaction
  const getCurrentDistance = (): number => {
    const input = container.querySelector(".sc-mymaps-buffer-container input[type='number']") as HTMLInputElement;
    return input ? parseFloat(input.value) || 0 : 0;
  };

  const getCurrentUnits = (): string => {
    const select = container.querySelector(".sc-mymaps-buffer-container select") as HTMLSelectElement;
    return select ? select.value : "meters";
  };

  const getCurrentColor = (): { r: number; g: number; b: number } => {
    const colorButton = container.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
    if (colorButton) {
      const bgColor = colorButton.style.backgroundColor;
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
    }
    // Default green color if no color found
    return { r: 85, g: 243, b: 30 };
  };

  const triggerBufferPreview = (distance: number, units: string) => {
    // This will directly call the buffer creation logic
    if (item?.featureGeoJSON) {
      // Import and use the buffer helpers directly
      import("@/utils/openlayers/BufferHelpers").then(({ bufferGeometry, convertToMeters }) => {
        import("@/utils/myMapsHelpers").then(({ featureFromGeoJSON }) => {
          import("ol").then(({ Feature }) => {
            import("ol/style").then(({ Style, Stroke, Fill }) => {
              import("ol/layer/Vector").then(({ default: VectorLayer }) => {
                import("ol/source").then(({ Vector: VectorSource }) => {
                  import("@/stores/mapStore").then(({ useMapStore }) => {
                    import("@/utils/openlayers/LayerManager").then(({ LayerManager }) => {
                      try {
                        const { map } = useMapStore.getState();
                        if (!map) return;

                        // Get or create buffer layer via LayerManager
                        let bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");

                        if (!bufferLayer) {
                          bufferLayer = new VectorLayer({
                            source: new VectorSource(),
                            zIndex: 999,
                          });
                          bufferLayer.set("id", "drawing-options-buffer-preview");
                          LayerManager.addLayer(bufferLayer, "Tools", "DrawingOptionsBufferPreview", { visible: true });
                        }

                        // Create buffer
                        const feature = featureFromGeoJSON(item.featureGeoJSON);
                        const geometry = feature.getGeometry();
                        if (!geometry) return;

                        const distanceMeters = convertToMeters(distance, units);

                        bufferGeometry(geometry, distanceMeters, (bufferedGeometry) => {
                          const bufferFeature = new Feature({ geometry: bufferedGeometry });

                          // Get current color from color picker button
                          const currentColor = getCurrentColor();

                          // Create style using selected color
                          const style = new Style({
                            stroke: new Stroke({
                              color: [currentColor.r, currentColor.g, currentColor.b, 1],
                              width: 3,
                            }),
                            fill: new Fill({
                              color: [currentColor.r, currentColor.g, currentColor.b, 0.7],
                            }),
                          });

                          bufferFeature.setStyle(style);

                          // Clear and add buffer
                          const source = bufferLayer.getSource();
                          if (source && "clear" in source && "addFeature" in source) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (source as any).clear();
                            if (distanceMeters > 0) {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              (source as any).addFeature(bufferFeature);
                            }
                          }
                        });
                      } catch (error) {
                        console.error("❌ Error creating buffer preview:", error);
                      }
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  };

  const triggerColorChange = (event: MouseEvent) => {
    // Remove any existing color picker
    const existingPicker = document.getElementById("sc-color-picker-container");
    if (existingPicker) {
      existingPicker.remove();
      return;
    }

    // Get current button color
    const colorButton = container.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;

    // Create CompactPicker replica
    const colorPicker = document.createElement("div");
    colorPicker.id = "sc-color-picker-container";
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
      // Row 1
      [
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
      ],
      // Row 2
      ["#000000", "#666666", "#B3B3B3", "#9F0500", "#C45100", "#FB9E00", "#808900", "#194D33", "#0C797D", "#0062B1", "#653294", "#AB149E"],
    ];

    const allColors = compactColors.flat();

    // Create the picker content
    colorPicker.innerHTML = `
          <div style="padding: 8px;">
            <div style="display: flex; flex-wrap: wrap; width: 270px;">
              ${allColors
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
              `,
                )
                .join("")}
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div id="selected-color-display" style="
                    width: 16px; 
                    height: 16px; 
                    background-color: #55F31E; 
                    border: 1px solid #ddd; 
                    border-radius: 3px;
                  "></div>
                  <input 
                    id="hex-input" 
                    type="text" 
                    value="#55F31E"
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
                  <span style="display: flex; align-items: center; gap: 2px;">R <input id="r-input" type="number" min="0" max="255" value="85" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
                  <span style="display: flex; align-items: center; gap: 2px;">G <input id="g-input" type="number" min="0" max="255" value="243" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
                  <span style="display: flex; align-items: center; gap: 2px;">B <input id="b-input" type="number" min="0" max="255" value="30" class="sc-color-picker-input" style="width: 45px; font-size: 11px; border: 1px solid #ddd; border-radius: 2px; padding: 3px 5px; text-align: center;"></span>
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

    // Prevent overlay interactions within the color picker
    colorPicker.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    colorPicker.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    // Add click handlers to color swatches
    const swatches = colorPicker.querySelectorAll(".color-swatch");
    swatches.forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        const selectedColor = (e.target as HTMLElement).getAttribute("data-color")!;
        handleColorSelection(selectedColor);
        updateColorDisplay(selectedColor);
        // Close picker after selection
        colorPicker.remove();
      });

      // Hover effect
      swatch.addEventListener("mouseenter", (e) => {
        const hoverColor = (e.target as HTMLElement).getAttribute("data-color")!;
        updateColorDisplay(hoverColor);
        (e.target as HTMLElement).style.border = "2px solid #333";
      });

      swatch.addEventListener("mouseleave", (e) => {
        (e.target as HTMLElement).style.border = "1px solid #ddd";
        // Restore current color when leaving hover
        const hexInput = document.getElementById("hex-input") as HTMLInputElement;
        if (hexInput) {
          updateColorDisplay(hexInput.value);
        }
      });
    });

    // Add input field event listeners
    const hexInput = colorPicker.querySelector("#hex-input") as HTMLInputElement;
    const rInput = colorPicker.querySelector("#r-input") as HTMLInputElement;
    const gInput = colorPicker.querySelector("#g-input") as HTMLInputElement;
    const bInput = colorPicker.querySelector("#b-input") as HTMLInputElement;

    // Hex input handler
    if (hexInput) {
      hexInput.addEventListener("input", (e) => {
        const hexValue = (e.target as HTMLInputElement).value;
        if (isValidHex(hexValue)) {
          const rgb = hexToRgb(hexValue);
          updateRGBInputs(rgb.r, rgb.g, rgb.b);
          updateSelectedColorDisplay(hexValue);
          handleColorSelection(hexValue);
        }
      });

      hexInput.addEventListener("focus", (e) => {
        e.stopPropagation();
      });

      hexInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    // RGB input handlers
    const updateFromRGB = () => {
      const r = Math.max(0, Math.min(255, parseInt(rInput.value) || 0));
      const g = Math.max(0, Math.min(255, parseInt(gInput.value) || 0));
      const b = Math.max(0, Math.min(255, parseInt(bInput.value) || 0));

      // Update the input values to ensure they're valid
      rInput.value = r.toString();
      gInput.value = g.toString();
      bInput.value = b.toString();

      const hexValue = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
      hexInput.value = hexValue;
      updateSelectedColorDisplay(hexValue);
      handleColorSelection(hexValue);
    };

    [rInput, gInput, bInput].forEach((input) => {
      if (input) {
        input.addEventListener("input", updateFromRGB);
        input.addEventListener("focus", (e) => e.stopPropagation());
        input.addEventListener("click", (e) => e.stopPropagation());
      }
    });

    // Set initial color values
    const initialColor = colorButton ? getComputedStyle(colorButton).backgroundColor : "rgb(85, 243, 30)";
    updateColorDisplay(rgbToHex(initialColor));

    // Close picker when clicking outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (!colorPicker.contains(e.target as Node)) {
        colorPicker.remove();
        document.removeEventListener("click", handleOutsideClick);
      }
    };

    // Delay adding the outside click handler
    setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 100);
  };

  const updateColorDisplay = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);

    // Update input fields
    const hexInput = document.getElementById("hex-input") as HTMLInputElement;
    const rInput = document.getElementById("r-input") as HTMLInputElement;
    const gInput = document.getElementById("g-input") as HTMLInputElement;
    const bInput = document.getElementById("b-input") as HTMLInputElement;

    if (hexInput) hexInput.value = hexColor.toUpperCase();
    if (rInput) rInput.value = rgb.r.toString();
    if (gInput) gInput.value = rgb.g.toString();
    if (bInput) bInput.value = rgb.b.toString();

    // Update selected color display
    updateSelectedColorDisplay(hexColor);
  };

  const updateSelectedColorDisplay = (hexColor: string) => {
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

  const isValidHex = (hex: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  // Helper to convert rgb() string to hex
  const rgbToHex = (rgb: string): string => {
    const result = rgb.match(/\d+/g);
    if (!result) return "#55F31E";
    return (
      "#" +
      result
        .map((x) => {
          const hex = parseInt(x).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  };

  const handleColorSelection = (hexColor: string) => {
    // Update the button color immediately
    const colorButton = container.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
    if (colorButton) {
      colorButton.style.backgroundColor = hexColor;
    }

    // Update buffer preview with new color
    if (item?.featureGeoJSON) {
      const currentDistance = getCurrentDistance();

      if (!isNaN(currentDistance) && currentDistance > 0) {
        // Re-trigger buffer preview with new color
        updateBufferColor(hexColor);
      }
    }
  };

  const updateBufferColor = (hexColor: string) => {
    import("ol/style").then(({ Style, Stroke, Fill }) => {
      import("@/stores/mapStore").then(({ useMapStore }) => {
        try {
          const { map } = useMapStore.getState();
          if (!map || !item?.featureGeoJSON) return;

          const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
          if (!bufferLayer) return;

          // Convert hex to RGB
          const rgb = hexToRgb(hexColor);

          // Create new style with selected color
          const style = new Style({
            stroke: new Stroke({
              color: [rgb.r, rgb.g, rgb.b, 1],
              width: 3,
            }),
            fill: new Fill({
              color: [rgb.r, rgb.g, rgb.b, 0.7],
            }),
          });

          // Update existing buffer feature style
          const source = bufferLayer.getSource();
          if (source && "getFeatures" in source) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const features = (source as any).getFeatures();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            features.forEach((feature: any) => {
              feature.setStyle(style);
            });
          }
        } catch (error) {
          console.error("❌ Error updating buffer color:", error);
        }
      });
    });
  };

  const triggerAddBufferToMyMaps = () => {
    import("@/stores/mapStore").then(({ useMapStore }) => {
      import("@/stores/eventStore").then(({ useEventStore }) => {
        try {
          const { map } = useMapStore.getState();
          const { emit } = useEventStore.getState();

          if (!map) {
            console.warn("MyMapsBuffer: No map found while adding buffer to MyMaps");
            return;
          }
          if (!item?.featureGeoJSON) {
            console.warn("MyMapsBuffer: No item geometry found while adding buffer to MyMaps");
            return;
          }

          const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");

          if (!bufferLayer) {
            console.warn("MyMapsBuffer: No buffer preview layer found while adding buffer to MyMaps");
            return;
          }

          // Get the buffer feature from the layer
          const source = bufferLayer.getSource();

          if (source && "getFeatures" in source) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const features = (source as any).getFeatures();

            if (features.length > 0) {
              const bufferFeature = features[0];

              // Get current distance and units
              const distance = getCurrentDistance();
              const units = getCurrentUnits();
              const label = `Buffer - ${distance} ${units}`;

              // Add the buffer feature directly to MyMaps store
              const featureStyle = bufferFeature.getStyle();
              const myMapsItem = createMyMapsItem(bufferFeature, "Buffer", label, featureStyle instanceof Style ? styleToJSON(featureStyle) : undefined);
              myMapsItem.featureGeoJSON = featureToGeoJSON(bufferFeature);
              useMyMapsStore.getState().addItem(myMapsItem);
              emit("mymap-item-created", { item: myMapsItem });

              // Hide the add message by removing the buffer preview
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (source as any).clear();

              // Hide the add buffer link
              showHideAddBufferLink(false);

              // Activate the MyMaps tab to show the newly added buffer
              activateTab("mymaps");
            } else {
              console.warn("MyMapsBuffer: No features found in buffer preview layer");
            }
          } else {
            console.warn("MyMapsBuffer: Buffer layer source not found or invalid");
          }
        } catch (error) {
          console.error("❌ Error adding buffer to MyMaps:", error);
        }
      });
    });
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 85, g: 243, b: 30 };
  };

  // Helper function to show/hide the add buffer link
  const showHideAddBufferLink = (show: boolean) => {
    // Find the add link by its text content (same logic as event listener attachment)
    const allLabels = container.querySelectorAll(".sc-mymaps-buffer-container label");
    let addLink: HTMLLabelElement | null = null;

    if (allLabels) {
      for (const label of allLabels) {
        const labelElement = label as HTMLLabelElement;
        if (labelElement.textContent && labelElement.textContent.includes("Add this buffer to MyMap Items")) {
          addLink = labelElement;
          break;
        }
      }
    }

    if (addLink) {
      if (show) {
        addLink.classList.remove("sc-hidden");
        addLink.classList.add("sc-fakeLink");
        addLink.style.display = "block";
        addLink.style.pointerEvents = "auto"; // Ensure it's clickable
      } else {
        addLink.classList.add("sc-hidden");
        addLink.classList.remove("sc-fakeLink");
        addLink.style.display = "none";
      }
    } else {
      console.warn("MyMapsBuffer: Could not find add buffer link element");
    }
  };

  // Helper function to clear buffer preview
  const clearBufferPreview = () => {
    import("@/stores/mapStore").then(({ useMapStore }) => {
      try {
        const { map } = useMapStore.getState();
        if (!map) return;

        const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
        if (bufferLayer) {
          const source = bufferLayer.getSource();
          if (source && "clear" in source) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (source as any).clear();
          }
        }
      } catch (error) {
        console.error("❌ Error clearing buffer preview:", error);
      }
    });
  };

  // Re-attach buffer component event listeners (React handlers are lost when copying HTML to overlay)
  const bufferDistanceInput = container.querySelector(".sc-mymaps-buffer-container input[type='number']") as HTMLInputElement;
  if (bufferDistanceInput) {
    const handleDistanceChange = (e: Event) => {
      const newDistance = parseFloat((e.target as HTMLInputElement).value);

      if (!isNaN(newDistance) && newDistance > 0) {
        // Manually trigger buffer preview since React handlers are lost
        triggerBufferPreview(newDistance, getCurrentUnits());

        // Show the add link
        showHideAddBufferLink(true);
      } else {
        // Hide buffer preview and link when distance is 0 or invalid
        clearBufferPreview();
        showHideAddBufferLink(false);
      }
    };

    bufferDistanceInput.addEventListener("input", handleDistanceChange);
    bufferDistanceInput.addEventListener("change", handleDistanceChange);
    bufferDistanceInput.addEventListener("keyup", handleDistanceChange);

    // Prevent input from interfering with header drag
    bufferDistanceInput.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Don't let this bubble up to header
    });
  }

  const bufferUnitsSelect = container.querySelector(".sc-mymaps-buffer-container select") as HTMLSelectElement;
  if (bufferUnitsSelect) {
    const handleUnitsChange = (e: Event) => {
      const newUnits = (e.target as HTMLSelectElement).value;
      const currentDistance = getCurrentDistance();

      if (!isNaN(currentDistance) && currentDistance > 0) {
        triggerBufferPreview(currentDistance, newUnits);
        showHideAddBufferLink(true);
      } else {
        clearBufferPreview();
        showHideAddBufferLink(false);
      }
    };

    bufferUnitsSelect.addEventListener("change", handleUnitsChange);

    // Prevent select from interfering with header drag
    bufferUnitsSelect.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Don't let this bubble up to header
    });
  }

  const bufferColorButton = container.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
  if (bufferColorButton) {
    bufferColorButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Trigger color change manually with event for positioning
      triggerColorChange(e as MouseEvent);
    });

    // Prevent the color button from interfering with header drag
    bufferColorButton.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Don't let this bubble up to header
    });
  }

  // Find the add buffer link by its specific text content
  const allLabels = container.querySelectorAll(".sc-mymaps-buffer-container label");

  let bufferAddLink: HTMLLabelElement | null = null;
  for (let index = 0; index < allLabels.length; index++) {
    const labelElement = allLabels[index] as HTMLLabelElement;
    if (labelElement.textContent && labelElement.textContent.includes("Add this buffer to MyMap Items")) {
      bufferAddLink = labelElement;
      break;
    }
  }

  if (bufferAddLink) {
    // Enable pointer events for the link (OL overlay interaction fix)
    bufferAddLink.style.pointerEvents = "auto";
    bufferAddLink.style.cursor = "pointer";

    bufferAddLink.addEventListener("click", (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      // Trigger add buffer to MyMaps manually
      triggerAddBufferToMyMaps();
    });

    // Prevent the link from interfering with header drag by stopping mousedown propagation
    bufferAddLink.addEventListener("mousedown", (e: Event) => {
      e.stopPropagation(); // Don't let this bubble up to header
    });

    // Only prevent propagation for link-specific events, not all mousedown/mouseup
    // This ensures header drag functionality isn't broken

    // Initially hide the link (should only show when distance > 0)
    const currentDistance = getCurrentDistance();
    showHideAddBufferLink(currentDistance > 0);
  } else {
    console.warn("MyMapsBuffer: Could not find buffer add link element for event binding");
  }

  // Enable interactions ONLY on specific buffer elements (targeted approach)
  // This prevents conflicts with header drag functionality
  const bufferContainer = container.querySelector(".sc-mymaps-buffer-container");
  if (bufferContainer) {
    // Only enable pointer events on specific interactive elements, not the container
    const specificElements = bufferContainer.querySelectorAll("input[type='number'], select, button#sc-mymaps-buffer-color-button-picker");
    specificElements.forEach((element) => {
      (element as HTMLElement).style.pointerEvents = "auto";
    });

    // The container itself should NOT have pointerEvents = "auto" to avoid header conflicts
    (bufferContainer as HTMLElement).style.pointerEvents = "";
  }
};

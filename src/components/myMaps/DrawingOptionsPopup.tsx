"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Overlay } from "ol";
import { Coordinate } from "ol/coordinate";

import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { useMapStore } from "@/stores/mapStore";
import { activateTab } from "@/utils/helpersUI";
import MyMapsPopupLabel from "./MyMapsPopupLabel";
import MyMapsBuffer from "./MyMapsBuffer";
import FooterButtons from "./FooterButtons";
import "./DrawingOptionsPopup.css";

interface DrawingOptionsPopupProps {
  item: MyMapsItemType | null;
  coordinate: Coordinate | null;
  isOpen: boolean;
  activeTool?: string;
  onClose: () => void;
  onTools?: (item: MyMapsItemType, event?: React.MouseEvent) => void;
  onDelete?: (item: MyMapsItemType) => void;
  onLabelChange?: (id: string, label: string) => void;
  onLabelVisibilityChange?: (id: string, visible: boolean) => void;
  onLabelRotationChange?: (id: string, rotation: number) => void;
}

const DrawingOptionsPopup: React.FC<DrawingOptionsPopupProps> = ({
  item,
  coordinate,
  isOpen,
  activeTool,
  onClose,
  onTools,
  onDelete,
  onLabelChange,
  onLabelVisibilityChange,
  onLabelRotationChange,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const overlayElementRef = useRef<HTMLDivElement | null>(null);
  const lastItemIdRef = useRef<string | null>(null);
  const activeInteractionIdsRef = useRef<number[]>([]);
  const hasBeenDraggedRef = useRef<boolean>(false);
  const { map } = useMapStore();

  // Create stable references for dependencies
  const itemId = item?.id;
  const itemLabel = item?.label;

  // Create overlay element and overlay once when first needed
  useEffect(() => {
    // Only create overlay if we don't have one yet and we have coordinates to position it
    if (!map || overlayRef.current || !coordinate) {
      return;
    }

    // Create a separate DOM element for OpenLayers that React doesn't manage
    const overlayElement = document.createElement("div");
    overlayElement.className = "ol-popup";
    overlayElement.id = "sc-window-popup-overlay";
    overlayElementRef.current = overlayElement;

    // Create overlay with the separate element
    const overlay = new Overlay({
      element: overlayElement,
      positioning: "bottom-center",
      stopEvent: true, // ✅ CRITICAL: Prevent popup events from affecting map below
      className: "ol-selectable",
      insertFirst: false,
    });

    overlayRef.current = overlay;
    map.addOverlay(overlay);
  }, [map, coordinate]);

  // Attach event listeners (memoized to prevent unnecessary re-attachments)
  const attachEventListeners = useCallback(() => {
    if (!overlayElementRef.current || !item) return;

    // Re-attach all necessary event listeners
    const closeButton = overlayElementRef.current.querySelector(".ol-popup-closer") as HTMLElement;
    if (closeButton) {
      closeButton.onclick = (e) => {
        e.preventDefault();
        onClose();
      };
    }

    // Re-attach input field event listeners for the label
    const labelInput = overlayElementRef.current.querySelector(".sc-mymaps-popup-label-input") as HTMLInputElement;

    if (labelInput && onLabelChange) {
      // Handle input events for live sync (on every keystroke)
      labelInput.addEventListener("input", () => {
        if (item) {
          onLabelChange(item.id, labelInput.value);
        }
      });

      // Handle keydown events
      labelInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && item) {
          onLabelChange(item.id, labelInput.value.trim());
        } else if (e.key === "Escape" && item) {
          labelInput.value = item.label;
        }
      });

      // Handle blur event - only call onLabelChange if value has actually changed
      labelInput.addEventListener("blur", () => {
        if (item && labelInput.value.trim() !== item.label) {
          onLabelChange(item.id, labelInput.value.trim());
        }
      });
    }

    // Re-attach checkbox click listener (React handlers are lost when copying HTML to overlay)
    const checkbox = overlayElementRef.current.querySelector(".sc-mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
    if (checkbox && onLabelVisibilityChange && item) {
      checkbox.onclick = (e) => {
        // Don't prevent default - let browser handle checkbox visual state
        e.stopPropagation(); // Just prevent event bubbling

        const newVisibility = checkbox.checked;

        // Update the store
        onLabelVisibilityChange(item.id, newVisibility);
      };
    }

    // Re-attach rotation slider change listener (React handlers are lost when copying HTML to overlay)
    const rotationSlider = overlayElementRef.current.querySelector(".sc-mymaps-popup-slider input[type='range']") as HTMLInputElement;
    if (rotationSlider && onLabelRotationChange && item) {
      rotationSlider.oninput = (e) => {
        e.stopPropagation();

        const newRotation = parseInt((e.target as HTMLInputElement).value);

        // Update the store
        onLabelRotationChange(item.id, newRotation);
      };
    }

    // Re-attach footer button event listeners (React handlers are lost when copying HTML to overlay)
    const footerButtons = overlayElementRef.current.querySelectorAll(".sc-mymaps-popup-footer-button");
    footerButtons.forEach((button) => {
      const buttonText = button.textContent?.trim().toLowerCase();
      if (buttonText && item) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (buttonText === "tools" && onTools) {
            onTools(item);
          } else if (buttonText === "delete" && onDelete) {
            onDelete(item);
          } else if (buttonText === "close") {
            onClose();
          }
        });
      }
    });

    // Re-attach other button event listeners if they exist
    const toolsButtons = overlayElementRef.current.querySelectorAll("[data-action]");
    toolsButtons.forEach((button) => {
      const action = button.getAttribute("data-action");
      if (action && item) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          if (action === "tools" && onTools) {
            onTools(item, e as unknown as React.MouseEvent);
          } else if (action === "delete" && onDelete) {
            onDelete(item);
          }
        });
      }
    });

    // Helper functions for buffer component DOM interaction
    const getCurrentDistance = (): number => {
      const input = overlayElementRef.current?.querySelector(".sc-mymaps-buffer-container input[type='number']") as HTMLInputElement;
      return input ? parseFloat(input.value) || 0 : 0;
    };

    const getCurrentUnits = (): string => {
      const select = overlayElementRef.current?.querySelector(".sc-mymaps-buffer-container select") as HTMLSelectElement;
      return select ? select.value : "meters";
    };

    const getCurrentColor = (): { r: number; g: number; b: number } => {
      const colorButton = overlayElementRef.current?.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
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
        console.log("🎯 Triggering buffer preview:", { distance, units, item });

        // Import and use the buffer helpers directly
        import("@/utils/openlayers/BufferHelpers").then(({ bufferGeometry, convertToMeters }) => {
          import("@/utils/myMapsHelpers").then(({ featureFromGeoJSON }) => {
            import("ol").then(({ Feature }) => {
              import("ol/style").then(({ Style, Stroke, Fill }) => {
                import("ol/layer/Vector").then(({ default: VectorLayer }) => {
                  import("ol/source").then(({ Vector: VectorSource }) => {
                    import("@/stores/mapStore").then(({ useMapStore }) => {
                      try {
                        const { map } = useMapStore.getState();
                        if (!map) return;

                        // Get or create buffer layer
                        let bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");

                        if (!bufferLayer) {
                          bufferLayer = new VectorLayer({
                            source: new VectorSource(),
                            zIndex: 999,
                          });
                          bufferLayer.set("id", "drawing-options-buffer-preview");
                          map.addLayer(bufferLayer);
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
                          console.log("🎨 Using buffer color:", currentColor);

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

                          console.log("✅ Buffer preview created successfully");
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
      }
    };

    const triggerColorChange = (event: MouseEvent) => {
      console.log("🎯 Color change triggered - showing CompactPicker");

      // Remove any existing color picker
      const existingPicker = document.getElementById("sc-color-picker-container");
      if (existingPicker) {
        existingPicker.remove();
        return;
      }

      // Get current button color
      const colorButton = overlayElementRef.current?.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;

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
      console.log("🎯 Color selected:", hexColor);

      // Update the button color immediately
      const colorButton = overlayElementRef.current?.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
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

            console.log("✅ Buffer color updated successfully");
          } catch (error) {
            console.error("❌ Error updating buffer color:", error);
          }
        });
      });
    };

    const triggerAddBufferToMyMaps = () => {
      console.log("🎯 Triggering add buffer to MyMaps");

      import("@/stores/mapStore").then(({ useMapStore }) => {
        import("@/stores/eventStore").then(({ useEventStore }) => {
          try {
            const { map } = useMapStore.getState();
            const { emit } = useEventStore.getState();

            console.log("🔍 Debug - map exists:", !!map);
            console.log("🔍 Debug - item exists:", !!item);
            console.log("🔍 Debug - item.featureGeoJSON exists:", !!item?.featureGeoJSON);

            if (!map) {
              console.log("❌ No map found");
              return;
            }
            if (!item?.featureGeoJSON) {
              console.log("❌ No item or featureGeoJSON found");
              return;
            }

            const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
            console.log("🔍 Debug - bufferLayer exists:", !!bufferLayer);

            if (!bufferLayer) {
              console.log("❌ No buffer layer found");
              return;
            }

            // Get the buffer feature from the layer
            const source = bufferLayer.getSource();
            console.log("🔍 Debug - source exists:", !!source);

            if (source && "getFeatures" in source) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const features = (source as any).getFeatures();
              console.log("🔍 Debug - features found:", features.length);

              if (features.length > 0) {
                const bufferFeature = features[0];

                // Get current distance and units
                const distance = getCurrentDistance();
                const units = getCurrentUnits();
                const label = `Buffer - ${distance} ${units}`;

                console.log("🎯 Adding buffer to MyMaps:", {
                  label,
                  feature: bufferFeature,
                  distance,
                  units,
                  hasStyle: !!bufferFeature.getStyle(),
                  style: bufferFeature.getStyle(),
                });

                // Emit event to add the buffer feature to MyMaps
                emit("addMyMapsFeature", {
                  feature: bufferFeature,
                  label: label,
                });

                console.log("🎯 Event emitted successfully");

                // Hide the add message by removing the buffer preview
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (source as any).clear();

                // Hide the add buffer link
                showHideAddBufferLink(false);

                console.log("✅ Buffer added to MyMaps successfully");

                // Activate the MyMaps tab to show the newly added buffer
                console.log("🎯 Activating MyMaps tab after buffer addition...");
                activateTab("mymaps");
              } else {
                console.log("❌ No features found in buffer layer");
              }
            } else {
              console.log("❌ Buffer layer source not found or invalid");
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
      console.log("🔗 showHideAddBufferLink called:", { show });

      // Find the add link by its text content (same logic as event listener attachment)
      const allLabels = overlayElementRef.current?.querySelectorAll(".sc-mymaps-buffer-container label");
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

      console.log("🔗 Found add link element:", !!addLink);

      if (addLink) {
        if (show) {
          addLink.classList.remove("sc-hidden");
          addLink.classList.add("sc-fakeLink");
          addLink.style.display = "block";
          addLink.style.pointerEvents = "auto"; // Ensure it's clickable
          console.log("🔗 Link shown");
        } else {
          addLink.classList.add("sc-hidden");
          addLink.classList.remove("sc-fakeLink");
          addLink.style.display = "none";
          console.log("🔗 Link hidden");
        }
      } else {
        console.log("❌ Could not find add buffer link element");
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
              console.log("🎯 Buffer preview cleared");
            }
          }
        } catch (error) {
          console.error("❌ Error clearing buffer preview:", error);
        }
      });
    };

    // Re-attach buffer component event listeners (React handlers are lost when copying HTML to overlay)
    const bufferDistanceInput = overlayElementRef.current.querySelector(".sc-mymaps-buffer-container input[type='number']") as HTMLInputElement;
    if (bufferDistanceInput) {
      const handleDistanceChange = (e: Event) => {
        console.log("🎯 Distance changed via DOM event:", (e.target as HTMLInputElement).value);
        const newDistance = parseFloat((e.target as HTMLInputElement).value);

        if (!isNaN(newDistance) && newDistance > 0) {
          // Manually trigger buffer preview since React handlers are lost
          console.log("🎯 Calling buffer preview manually");
          triggerBufferPreview(newDistance, getCurrentUnits());

          // Show the add link
          showHideAddBufferLink(true);
        } else {
          // Hide buffer preview and link when distance is 0 or invalid
          console.log("🎯 Clearing buffer preview (distance <= 0)");
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

    const bufferUnitsSelect = overlayElementRef.current.querySelector(".sc-mymaps-buffer-container select") as HTMLSelectElement;
    if (bufferUnitsSelect) {
      const handleUnitsChange = (e: Event) => {
        console.log("🎯 Units changed via DOM event:", (e.target as HTMLSelectElement).value);
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

    const bufferColorButton = overlayElementRef.current.querySelector("#sc-mymaps-buffer-color-button-picker") as HTMLButtonElement;
    if (bufferColorButton) {
      bufferColorButton.addEventListener("click", (e) => {
        console.log("🎯 Color button clicked via DOM event");
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
    console.log("🔍 Looking for buffer add link element...");
    const allLabels = overlayElementRef.current.querySelectorAll(".sc-mymaps-buffer-container label");
    console.log("🔍 Found labels in buffer container:", allLabels.length);

    let bufferAddLink: HTMLLabelElement | null = null;
    for (let index = 0; index < allLabels.length; index++) {
      const labelElement = allLabels[index] as HTMLLabelElement;
      console.log(`🔍 Label ${index}: "${labelElement.textContent}" | classes: "${labelElement.className}"`);
      if (labelElement.textContent && labelElement.textContent.includes("Add this buffer to MyMap Items")) {
        bufferAddLink = labelElement;
        console.log("✅ Found the correct add buffer link!");
        break;
      }
    }

    console.log("🔍 Final bufferAddLink found:", !!bufferAddLink);

    if (bufferAddLink) {
      console.log("🔍 bufferAddLink text content:", bufferAddLink.textContent);
      console.log("🔍 bufferAddLink classes:", bufferAddLink.className);

      // Enable pointer events for the link (OL overlay interaction fix)
      bufferAddLink.style.pointerEvents = "auto";
      bufferAddLink.style.cursor = "pointer";

      bufferAddLink.addEventListener("click", (e: Event) => {
        console.log("🎯 Add buffer to MyMaps clicked via DOM event!!!");
        console.log("🎯 Event target:", e.target);
        console.log("🎯 Event current target:", e.currentTarget);
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
      console.log("🔍 Initial distance for link visibility:", currentDistance);
      showHideAddBufferLink(currentDistance > 0);
    } else {
      console.log("❌ Could not find buffer add link element for event binding");
    }

    // Enable interactions ONLY on specific buffer elements (targeted approach)
    // This prevents conflicts with header drag functionality
    const bufferContainer = overlayElementRef.current.querySelector(".sc-mymaps-buffer-container");
    if (bufferContainer) {
      console.log("🔧 Enabling pointer events on specific buffer interactive elements only");

      // Only enable pointer events on specific interactive elements, not the container
      const specificElements = bufferContainer.querySelectorAll("input[type='number'], select, button#sc-mymaps-buffer-color-button-picker");
      specificElements.forEach((element, index) => {
        (element as HTMLElement).style.pointerEvents = "auto";
        console.log(`🔧 Enabled pointer events on specific element ${index}:`, element.tagName, element.id || element.className);
      });

      // The container itself should NOT have pointerEvents = "auto" to avoid header conflicts
      (bufferContainer as HTMLElement).style.pointerEvents = "";
    }
  }, [item, onClose, onTools, onDelete, onLabelChange, onLabelVisibilityChange, onLabelRotationChange]);

  // Track when activeTool changes for proper DOM sync
  const lastActiveToolRef = useRef<string | undefined>(undefined);

  // Sync React content to overlay element when structure changes
  useEffect(() => {
    if (!overlayElementRef.current || !popupRef.current || !itemId) return;

    // Check if item or activeTool changed
    const itemChanged = lastItemIdRef.current !== itemId;
    const toolChanged = lastActiveToolRef.current !== activeTool;
    lastItemIdRef.current = itemId || null;
    lastActiveToolRef.current = activeTool;

    // Reset drag flag when item changes (new feature selected)
    if (itemChanged) {
      hasBeenDraggedRef.current = false;
    }

    // Copy content if item changed OR if activeTool changed (to show/hide tool components)
    if ((itemChanged || toolChanged) && itemId) {
      // Preserve focus and cursor position before copying content
      const activeElement = overlayElementRef.current.querySelector(":focus") as HTMLInputElement;
      const cursorPosition = activeElement?.selectionStart || 0;
      const wasInputFocused = activeElement && activeElement.classList.contains("sc-mymaps-popup-label-input");

      // Copy the React-rendered content to the overlay element
      overlayElementRef.current.innerHTML = popupRef.current.innerHTML;

      // Restore focus and cursor position after copying
      if (wasInputFocused) {
        const newLabelInput = overlayElementRef.current.querySelector(".sc-mymaps-popup-label-input") as HTMLInputElement;
        if (newLabelInput) {
          newLabelInput.focus();
          newLabelInput.setSelectionRange(cursorPosition, cursorPosition);
        }
      }

      // Re-attach all event listeners
      attachEventListeners();
    }
  }, [itemId, activeTool, attachEventListeners]);

  // Sync label value when it changes externally (without full DOM manipulation)
  useEffect(() => {
    if (overlayElementRef.current && itemId && itemLabel && isOpen && lastItemIdRef.current === itemId) {
      const labelInput = overlayElementRef.current.querySelector(".sc-mymaps-popup-label-input") as HTMLInputElement;
      if (labelInput && labelInput.value !== itemLabel && document.activeElement !== labelInput) {
        // Only sync if the input is not currently focused (user not typing)
        labelInput.value = itemLabel;
      }
    }
  }, [itemLabel, isOpen, itemId]);

  // Sync checkbox state when it changes externally (e.g., from store updates)
  useEffect(() => {
    if (overlayElementRef.current && item && isOpen) {
      const checkbox = overlayElementRef.current.querySelector(".sc-mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = item.labelVisible;
      }
    }
  }, [isOpen, item?.labelVisible, item]); // Watch for item changes

  // Sync rotation slider value when it changes externally (e.g., from store updates)
  useEffect(() => {
    if (overlayElementRef.current && item && isOpen) {
      const rotationSlider = overlayElementRef.current.querySelector(".sc-mymaps-popup-slider input[type='range']") as HTMLInputElement;
      if (rotationSlider) {
        rotationSlider.value = (item.labelRotation || 0).toString();
      }
    }
  }, [isOpen, item?.labelRotation, item]); // Watch for rotation changes

  // Cleanup overlay only on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        try {
          const overlays = map.getOverlays().getArray();
          if (overlays.includes(overlayRef.current)) {
            map.removeOverlay(overlayRef.current);
          }
        } catch {
          // Ignore errors when removing overlay on unmount
        }
      }
      if (overlayElementRef.current) {
        overlayElementRef.current.remove();
        overlayElementRef.current = null;
      }
      overlayRef.current = null;
    };
  }, [map]);

  // Update overlay position and visibility
  useEffect(() => {
    if (!overlayRef.current) return;

    try {
      if (isOpen && coordinate) {
        // Only auto-position if popup hasn't been manually dragged
        if (!hasBeenDraggedRef.current) {
          overlayRef.current.setPosition(coordinate);
        }
      } else {
        overlayRef.current.setPosition(undefined);
        // Reset drag flag when popup closes
        hasBeenDraggedRef.current = false;
      }
    } catch {
      // Ignore errors when updating overlay position
    }
  }, [isOpen, coordinate, map]);

  // Apply old app's mouseover/mouseout interaction handling strategy
  useEffect(() => {
    if (!map || !overlayElementRef.current || !isOpen) return;

    const container = overlayElementRef.current;

    // Mouseover handler - disable ALL interactions and track active ones
    const handleMouseOver = () => {
      // console.log("🔒 Mouse over popup - disabling interactions");

      // Clear previous activeIds and rebuild (like old app)
      activeInteractionIdsRef.current = [];

      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          // Store the ol_uid for precise restoration
          activeInteractionIdsRef.current.push((interaction as unknown as { ol_uid: number }).ol_uid);
          interaction.setActive(false);
          // console.log("🔒 Disabled interaction:", interaction.constructor.name);
        }
      });

      // Set global popup active flag
      (window as unknown as { popupActive: boolean }).popupActive = true;
      console.log("🔒 Global popupActive set to TRUE");
    };

    // Mouseout handler - restore only previously active interactions
    const handleMouseOut = () => {
      // console.log("🔓 Mouse out of popup - re-enabling interactions");

      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
          // console.log("🔓 Re-enabled interaction:", interaction.constructor.name);
        }
      });

      // Clear global popup active flag
      (window as unknown as { popupActive: boolean }).popupActive = false;
      console.log("🔓 Global popupActive set to FALSE");
    };

    // Use native DOM events exactly like old app
    container.onmouseover = handleMouseOver;
    container.onmouseout = handleMouseOut;

    return () => {
      // Cleanup event listeners
      if (container) {
        container.onmouseover = null;
        container.onmouseout = null;
      }

      // Clear popup active flag on cleanup
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };
  }, [map, isOpen]);

  // Ensure interactions are restored when popup closes (regardless of close method)
  useEffect(() => {
    // When popup closes, restore interactions if they were disabled
    if (!isOpen && map && activeInteractionIdsRef.current.length > 0) {
      console.log("🔓 Popup closed - restoring interactions");

      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
        }
      });

      // Clear the active interactions list and popup active flag
      activeInteractionIdsRef.current = [];
      (window as unknown as { popupActive: boolean }).popupActive = false;
      console.log("🔓 Global popupActive set to FALSE on popup close");
    }
  }, [isOpen, map]);

  // Handle drag functionality - matching old app implementation
  useEffect(() => {
    if (!overlayElementRef.current || !map || !overlayRef.current || !isOpen) return;

    const headerElement = overlayElementRef.current.querySelector("#sc-popup-header") as HTMLElement;
    if (!headerElement) return;

    let isMoving = false;

    const handleMouseDown = (evt: MouseEvent) => {
      // Ignore clicks on buttons - exactly like old app
      const target = evt.target as Element;
      if (target.classList.contains("ol-popup-closer") || target.classList.contains("ol-popup-previous") || target.classList.contains("ol-popup-next")) {
        return;
      }

      // CRITICAL: Only allow drag if click is directly on the header element or its immediate children
      // This prevents buffer tool elements from interfering with drag functionality
      if (target !== headerElement && !headerElement.contains(target)) {
        return;
      }

      // Additional safeguard: Don't start drag if click is on any buffer-related elements
      if (target.closest(".sc-mymaps-buffer-container") || target.id === "sc-mymaps-buffer-color-button-picker" || target.matches("input, select, button, label")) {
        console.log("🚫 Drag blocked - click on buffer element:", target.tagName, target.id || target.className);
        return;
      }

      // Calculate initial offset between mouse and popup position
      const currentCoord = overlayRef.current?.getPosition();
      const mouseCoord = map.getEventCoordinate(evt);
      let dragOffset: { x: number; y: number } | null = null;

      if (currentCoord && mouseCoord) {
        dragOffset = {
          x: currentCoord[0] - mouseCoord[0],
          y: currentCoord[1] - mouseCoord[1],
        };
      }

      // Disable map interactions during drag
      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          interaction.setActive(false);
          // Store the previous active state for restoration
          (interaction as unknown as { _wasActiveBeforeDrag?: boolean })._wasActiveBeforeDrag = true;
        }
      });

      const move = (evt: MouseEvent) => {
        if (!map || !overlayRef.current || !dragOffset) return;

        // Get mouse coordinate and apply offset
        const mouseCoord = map.getEventCoordinate(evt);
        if (mouseCoord) {
          const newCoord = [mouseCoord[0] + dragOffset.x, mouseCoord[1] + dragOffset.y];

          if (isMoving) {
            overlayRef.current.setPosition(newCoord);
            hasBeenDraggedRef.current = true; // Mark as manually dragged
          } else {
            isMoving = true;
          }
        }
      };

      const end = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", end);
        isMoving = false;

        // Re-enable map interactions
        map.getInteractions().forEach((interaction) => {
          const interactionWithFlag = interaction as unknown as { _wasActiveBeforeDrag?: boolean };
          if (interactionWithFlag._wasActiveBeforeDrag) {
            interaction.setActive(true);
            delete interactionWithFlag._wasActiveBeforeDrag;
          }
        });

        document.body.style.cursor = "";
        headerElement.style.cursor = "grab";
      };

      // Set cursor states
      document.body.style.cursor = "grabbing";
      headerElement.style.cursor = "grabbing";

      // Use window event listeners like old app
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
    };

    headerElement.addEventListener("mousedown", handleMouseDown);
    console.log("🎯 Drag functionality attached to header");

    return () => {
      headerElement.removeEventListener("mousedown", handleMouseDown);
      console.log("🎯 Drag functionality cleaned up");
    };
  }, [map, isOpen, itemId, activeTool]); // Include activeTool to re-attach when buffer tool opens/closes

  // Always render the popup element, visibility is controlled by overlay position
  if (!item) {
    return null;
  }

  return (
    <div className="ol-popup" id="sc-window-popup" ref={popupRef} style={{ position: "absolute", left: "-9999px", visibility: "hidden" }}>
      {/* Header */}
      <div id="sc-popup-header" className="sc-popup-header sc-no-select">
        <div>Drawing Options</div>
        <div className="sc-popup-content-next-button" title="Next">
          <a className="ol-popup-next" href="#" style={{ display: "block" }}></a>
        </div>
        <div className="sc-popup-content-prev-button sc-disabled" title="Previous">
          <a className="ol-popup-previous" href="#" style={{ display: "block" }}></a>
        </div>
        <div className="sc-popup-header-close-button">
          <a
            className="ol-popup-closer"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          ></a>
        </div>
      </div>

      {/* Content */}
      <div className="ol-popup-content" id="sc-window-popup-content">
        <div className="sc-mymaps-popup-container">
          {/* Label Component - Always shown */}
          <MyMapsPopupLabel item={item} onLabelChange={onLabelChange} onLabelRotationChange={onLabelRotationChange} />

          {/* Tool-specific components */}
          <div className="sc-hidden">{/* Symbolizer placeholder */}</div>
          <MyMapsBuffer visible={activeTool === "buffer"} item={item} />
          <div className="sc-hidden">{/* Measure placeholder */}</div>

          {/* Footer Buttons - Always shown */}
          <FooterButtons onTools={onTools ? (event) => onTools(item, event) : undefined} onDelete={onDelete ? () => onDelete(item) : undefined} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default DrawingOptionsPopup;

"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Overlay } from "ol";
import { Coordinate } from "ol/coordinate";

import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { useMapStore } from "@/stores/mapStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";

import MyMapsPopupLabel from "@/components/myMaps/MyMapsPopupLabel";
import MyMapsBuffer, { attachBufferListeners } from "@/components/myMaps/MyMapsBuffer";
import MyMapsSymbolizer, { attachSymbolizerListeners } from "@/components/myMaps/MyMapsSymbolizer";
import MyMapsMeasure, { attachMeasureListeners } from "@/components/myMaps/MyMapsMeasure";
import FooterButtons from "@/components/myMaps/FooterButtons";

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
  const { updateItem } = useMyMapsStore();
  const { emit } = useEventStore();

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
    const labelInput = overlayElementRef.current.querySelector(".mymaps-popup-label-input") as HTMLInputElement;

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
    const checkbox = overlayElementRef.current.querySelector(".mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
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
    const rotationSlider = overlayElementRef.current.querySelector(".mymaps-popup-slider input[type='range']") as HTMLInputElement;
    if (rotationSlider && onLabelRotationChange && item) {
      rotationSlider.oninput = (e) => {
        e.stopPropagation();

        const newRotation = parseInt((e.target as HTMLInputElement).value);

        // Update the store
        onLabelRotationChange(item.id, newRotation);
      };
    }

    // Re-attach footer button event listeners (React handlers are lost when copying HTML to overlay)
    const footerButtons = overlayElementRef.current.querySelectorAll("[data-action]");
    footerButtons.forEach((button) => {
      const action = button.getAttribute("data-action");
      if (action && item) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (action === "tools" && onTools) {
            onTools(item, e as unknown as React.MouseEvent);
          } else if (action === "delete" && onDelete) {
            onDelete(item);
          } else if (action === "close") {
            onClose();
          }
        });
      }
    });

    // Re-attach buffer component event listeners (React handlers are lost when
    // copying HTML to overlay). Logic extracted to MyMapsBuffer.tsx.
    attachBufferListeners(overlayElementRef.current, item);

    // Re-attach symbolizer component event listeners (React handlers are lost when
    // copying HTML to overlay). Logic extracted to MyMapsSymbolizer.tsx.
    attachSymbolizerListeners(overlayElementRef.current, item, updateItem, emit);

    // Re-attach measure component event listeners (React handlers are lost when
    // copying HTML to overlay). Logic extracted to MyMapsMeasure.tsx.
    attachMeasureListeners(overlayElementRef.current, item);
  }, [item, onClose, onTools, onDelete, onLabelChange, onLabelVisibilityChange, onLabelRotationChange, emit, updateItem]);

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
      const wasInputFocused = activeElement && activeElement.classList.contains("mymaps-popup-label-input");

      // Copy the React-rendered content to the overlay element
      overlayElementRef.current.innerHTML = popupRef.current.innerHTML;

      // Store the current item ID for DOM event handlers to use
      overlayElementRef.current.setAttribute("data-item-id", itemId);

      // Restore focus and cursor position after copying
      if (wasInputFocused) {
        const newLabelInput = overlayElementRef.current.querySelector(".mymaps-popup-label-input") as HTMLInputElement;
        if (newLabelInput) {
          newLabelInput.focus();
          newLabelInput.setSelectionRange(cursorPosition, cursorPosition);
        }
      }

      // Restore controlled-input state lost during innerHTML copy. React renders
      // the checkbox/slider via DOM properties (`checked`/`value`), but innerHTML
      // only serializes attributes, so the copied DOM falls back to defaults. The
      // dedicated sync effects below only watch item/labelVisible/labelRotation and
      // do NOT re-run when activeTool changes, so restore these explicitly here.
      if (item) {
        const checkbox = overlayElementRef.current.querySelector(".mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = item.labelVisible;
        }
        const rotationSlider = overlayElementRef.current.querySelector(".mymaps-popup-slider input[type='range']") as HTMLInputElement;
        if (rotationSlider) {
          rotationSlider.value = (item.labelRotation || 0).toString();
        }
      }

      // Re-attach all event listeners
      attachEventListeners();
    }
  }, [itemId, activeTool, attachEventListeners, item]);

  // Sync label value when it changes externally (without full DOM manipulation)
  useEffect(() => {
    if (overlayElementRef.current && itemId && itemLabel && isOpen && lastItemIdRef.current === itemId) {
      const labelInput = overlayElementRef.current.querySelector(".mymaps-popup-label-input") as HTMLInputElement;
      if (labelInput && labelInput.value !== itemLabel && document.activeElement !== labelInput) {
        // Only sync if the input is not currently focused (user not typing)
        labelInput.value = itemLabel;
      }
    }
  }, [itemLabel, isOpen, itemId]);

  // Sync checkbox state when it changes externally (e.g., from store updates)
  useEffect(() => {
    if (overlayElementRef.current && item && isOpen) {
      const checkbox = overlayElementRef.current.querySelector(".mymaps-popup-checkbox input[type='checkbox']") as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = item.labelVisible;
      }
    }
  }, [isOpen, item?.labelVisible, item]); // Watch for item changes

  // Sync rotation slider value when it changes externally (e.g., from store updates)
  useEffect(() => {
    if (overlayElementRef.current && item && isOpen) {
      const rotationSlider = overlayElementRef.current.querySelector(".mymaps-popup-slider input[type='range']") as HTMLInputElement;
      if (rotationSlider) {
        rotationSlider.value = (item.labelRotation || 0).toString();
      }
    }
  }, [isOpen, item?.labelRotation, item]); // Watch for rotation changes

  // Sync symbolizer content when labelVisible changes (show/hide label style rows).
  // Replaces only the child .mymaps-symbolizer-container — NOT the overlay container —
  // so no mouseout fires on the overlay, preventing interaction/drag lockup.
  useEffect(() => {
    if (!overlayElementRef.current || !popupRef.current || !item || !isOpen) return;
    const reactSymbolizer = popupRef.current.querySelector(".mymaps-symbolizer-container");
    const overlaySymbolizer = overlayElementRef.current.querySelector(".mymaps-symbolizer-container");
    if (reactSymbolizer && overlaySymbolizer) {
      overlaySymbolizer.innerHTML = reactSymbolizer.innerHTML;
      attachSymbolizerListeners(overlayElementRef.current, item, updateItem, emit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.labelVisible, isOpen]);

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
      // Clear previous activeIds and rebuild (like old app)
      activeInteractionIdsRef.current = [];

      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          // Store the ol_uid for precise restoration
          activeInteractionIdsRef.current.push((interaction as unknown as { ol_uid: number }).ol_uid);
          interaction.setActive(false);
        }
      });

      // Set global popup active flag
      (window as unknown as { popupActive: boolean }).popupActive = true;
    };

    // Mouseout handler - restore only previously active interactions
    const handleMouseOut = () => {
      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
        }
      });

      // Clear global popup active flag
      (window as unknown as { popupActive: boolean }).popupActive = false;
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
      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
        }
      });

      // Clear the active interactions list and popup active flag
      activeInteractionIdsRef.current = [];
      (window as unknown as { popupActive: boolean }).popupActive = false;
    }
  }, [isOpen, map]);

  // Handle drag functionality - matching old app implementation
  useEffect(() => {
    if (!overlayElementRef.current || !map || !overlayRef.current || !isOpen) return;

    const headerElement = overlayElementRef.current.querySelector("#popup-header") as HTMLElement;
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

      // Additional safeguard: Don't start drag if click is on any tool-related elements
      if (
        target.closest(".sc-mymaps-buffer-container") ||
        target.closest(".mymaps-symbolizer-container") ||
        target.id === "sc-mymaps-buffer-color-button-picker" ||
        target.id === "sc-mymaps-symbolizer-color-button" ||
        target.id === "sc-mymaps-symbolizer-stroke-color-button" ||
        target.matches("input, select, button, label")
      ) {
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

    return () => {
      headerElement.removeEventListener("mousedown", handleMouseDown);
    };
  }, [map, isOpen, itemId, activeTool]); // Include activeTool to re-attach when buffer tool opens/closes

  // Always render the popup element, visibility is controlled by overlay position
  if (!item) {
    return null;
  }

  return (
    <div className="ol-popup" id="sc-window-popup" ref={popupRef} style={{ position: "absolute", left: "-9999px", visibility: "hidden" }}>
      {/* Header */}
      <div id="popup-header" className="popup-header select-none">
        <div>Drawing Options</div>
        <div className="z-[500]">
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
        <div className="text-xs flex flex-col gap-[3px] min-h-auto">
          {/* Label Component - Always shown */}
          <MyMapsPopupLabel item={item} onLabelChange={onLabelChange} onLabelVisibilityChange={onLabelVisibilityChange} onLabelRotationChange={onLabelRotationChange} />

          {/* Tool-specific components */}
          <MyMapsSymbolizer visible={activeTool === "symbolize"} item={item} />
          <MyMapsBuffer visible={activeTool === "buffer"} item={item} />
          <MyMapsMeasure visible={activeTool === "measure"} item={item} />

          {/* Footer Buttons - Always shown */}
          <FooterButtons onTools={onTools ? (event) => onTools(item, event) : undefined} onDelete={onDelete ? () => onDelete(item) : undefined} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default DrawingOptionsPopup;

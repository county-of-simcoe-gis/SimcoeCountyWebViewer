"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Overlay } from "ol";
import { Coordinate } from "ol/coordinate";

import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { useMapStore } from "@/stores/mapStore";
import MyMapsPopupLabel from "./MyMapsPopupLabel";
import FooterButtons from "./FooterButtons";
import "./DrawingOptionsPopup.css";

interface DrawingOptionsPopupProps {
  item: MyMapsItemType | null;
  coordinate: Coordinate | null;
  isOpen: boolean;
  onClose: () => void;
  onTools?: (item: MyMapsItemType) => void;
  onDelete?: (item: MyMapsItemType) => void;
  onLabelChange?: (id: string, label: string) => void;
  onLabelVisibilityChange?: (id: string, visible: boolean) => void;
  onLabelRotationChange?: (id: string, rotation: number) => void;
}

const DrawingOptionsPopup: React.FC<DrawingOptionsPopupProps> = ({ item, coordinate, isOpen, onClose, onTools, onDelete, onLabelChange, onLabelVisibilityChange, onLabelRotationChange }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const overlayElementRef = useRef<HTMLDivElement | null>(null);
  const lastItemIdRef = useRef<string | null>(null);
  const activeInteractionIdsRef = useRef<number[]>([]);
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
      stopEvent: false,
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

    // Re-attach other button event listeners if they exist
    const toolsButtons = overlayElementRef.current.querySelectorAll("[data-action]");
    toolsButtons.forEach((button) => {
      const action = button.getAttribute("data-action");
      if (action && item) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          if (action === "tools" && onTools) {
            onTools(item);
          } else if (action === "delete" && onDelete) {
            onDelete(item);
          }
        });
      }
    });
  }, [item, onClose, onTools, onDelete, onLabelChange, onLabelVisibilityChange]);

  // Sync React content to overlay element only when structure changes (not just label changes)
  useEffect(() => {
    if (!overlayElementRef.current || !popupRef.current || !itemId) return;

    // Only do full DOM manipulation if this is a different item or first render
    const itemChanged = lastItemIdRef.current !== itemId;
    lastItemIdRef.current = itemId || null;

    if (itemChanged && itemId) {
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
  }, [itemId, attachEventListeners]);

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
        overlayRef.current.setPosition(coordinate);
      } else {
        overlayRef.current.setPosition(undefined);
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
  }, [map, isOpen]); // Depend on isOpen to reinitialize when popup opens

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

          {/* Hidden components for future implementation */}
          <div className="sc-hidden">{/* Symbolizer placeholder */}</div>
          <div className="sc-hidden">{/* Buffer placeholder */}</div>
          <div className="sc-hidden">{/* Measure placeholder */}</div>

          {/* Footer Buttons - Always shown */}
          <FooterButtons onTools={onTools ? () => onTools(item) : undefined} onDelete={onDelete ? () => onDelete(item) : undefined} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default DrawingOptionsPopup;

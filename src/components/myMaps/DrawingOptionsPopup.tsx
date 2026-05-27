"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Overlay } from "ol";
import { Coordinate } from "ol/coordinate";

import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { useMapStore } from "@/stores/mapStore";

import MyMapsPopupLabel from "@/components/myMaps/MyMapsPopupLabel";
import MyMapsBuffer from "@/components/myMaps/MyMapsBuffer";
import MyMapsSymbolizer from "@/components/myMaps/MyMapsSymbolizer";
import MyMapsMeasure from "@/components/myMaps/MyMapsMeasure";
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
  const overlayRef = useRef<Overlay | null>(null);
  const overlayElementRef = useRef<HTMLDivElement | null>(null);
  const activeInteractionIdsRef = useRef<number[]>([]);
  const hasBeenDraggedRef = useRef<boolean>(false);
  const lastItemIdRef = useRef<string | null>(null);
  const { map } = useMapStore();

  const itemId = item?.id;

  // Create overlay element and overlay once when first needed
  useEffect(() => {
    if (!map || overlayRef.current || !coordinate) {
      return;
    }

    const overlayElement = document.createElement("div");
    overlayElement.className = "ol-popup";
    overlayElement.id = "sc-window-popup-overlay";
    overlayElementRef.current = overlayElement;

    const overlay = new Overlay({
      element: overlayElement,
      positioning: "bottom-center",
      stopEvent: true,
      className: "ol-selectable",
      insertFirst: false,
    });

    overlayRef.current = overlay;
    map.addOverlay(overlay);
  }, [map, coordinate]);

  // Reset drag flag when item changes
  useEffect(() => {
    if (lastItemIdRef.current !== itemId) {
      hasBeenDraggedRef.current = false;
      lastItemIdRef.current = itemId || null;
    }
  }, [itemId]);

  // Cleanup overlay on unmount
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
        if (!hasBeenDraggedRef.current) {
          overlayRef.current.setPosition(coordinate);
        }
      } else {
        overlayRef.current.setPosition(undefined);
        hasBeenDraggedRef.current = false;
      }
    } catch {
      // Ignore errors when updating overlay position
    }
  }, [isOpen, coordinate, map]);

  // Mouseover/mouseout interaction handling - disable map interactions while hovering popup
  useEffect(() => {
    if (!map || !overlayElementRef.current || !isOpen) return;

    const container = overlayElementRef.current;

    const handleMouseOver = () => {
      activeInteractionIdsRef.current = [];
      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          activeInteractionIdsRef.current.push((interaction as unknown as { ol_uid: number }).ol_uid);
          interaction.setActive(false);
        }
      });
      (window as unknown as { popupActive: boolean }).popupActive = true;
    };

    const handleMouseOut = () => {
      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
        }
      });
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };

    container.onmouseover = handleMouseOver;
    container.onmouseout = handleMouseOut;

    return () => {
      if (container) {
        container.onmouseover = null;
        container.onmouseout = null;
      }
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };
  }, [map, isOpen]);

  // Restore interactions when popup closes
  useEffect(() => {
    if (!isOpen && map && activeInteractionIdsRef.current.length > 0) {
      map.getInteractions().forEach((interaction) => {
        const interactionUid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(interactionUid)) {
          interaction.setActive(true);
        }
      });
      activeInteractionIdsRef.current = [];
      (window as unknown as { popupActive: boolean }).popupActive = false;
    }
  }, [isOpen, map]);

  // Handle header drag functionality
  const handleHeaderMouseDown = useCallback(
    (evt: React.MouseEvent<HTMLDivElement>) => {
      if (!map || !overlayRef.current) return;

      const target = evt.target as Element;

      // Don't start drag on interactive elements
      if (
        target.closest(".ol-popup-closer") ||
        target.matches("input, select, button, label, a") ||
        target.closest(".sc-mymaps-buffer-container") ||
        target.closest(".mymaps-symbolizer-container") ||
        target.closest(".sc-mymaps-measure-container")
      ) {
        return;
      }

      const currentCoord = overlayRef.current.getPosition();
      const mouseCoord = map.getEventCoordinate(evt.nativeEvent);
      if (!currentCoord || !mouseCoord) return;

      const dragOffset = {
        x: currentCoord[0] - mouseCoord[0],
        y: currentCoord[1] - mouseCoord[1],
      };

      // Disable map interactions during drag
      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          interaction.setActive(false);
          (interaction as unknown as { _wasActiveBeforeDrag?: boolean })._wasActiveBeforeDrag = true;
        }
      });

      let isMoving = false;

      const move = (moveEvt: MouseEvent) => {
        if (!map || !overlayRef.current) return;
        const mouseCoord = map.getEventCoordinate(moveEvt);
        if (mouseCoord) {
          const newCoord = [mouseCoord[0] + dragOffset.x, mouseCoord[1] + dragOffset.y];
          if (isMoving) {
            overlayRef.current.setPosition(newCoord);
            hasBeenDraggedRef.current = true;
          } else {
            isMoving = true;
          }
        }
      };

      const end = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", end);
        map.getInteractions().forEach((interaction) => {
          const interactionWithFlag = interaction as unknown as { _wasActiveBeforeDrag?: boolean };
          if (interactionWithFlag._wasActiveBeforeDrag) {
            interaction.setActive(true);
            delete interactionWithFlag._wasActiveBeforeDrag;
          }
        });
        document.body.style.cursor = "";
      };

      document.body.style.cursor = "grabbing";
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
    },
    [map],
  );

  if (!item || !overlayElementRef.current) {
    return null;
  }

  // Render directly into the overlay element (which already has className="ol-popup")
  // so the CSS arrow pseudo-elements work correctly without nesting .ol-popup > .ol-popup
  return createPortal(
    <>
      {/* Header */}
      <div id="popup-header" className="popup-header select-none cursor-grab" onMouseDown={handleHeaderMouseDown}>
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
          <MyMapsPopupLabel item={item} onLabelChange={onLabelChange} onLabelVisibilityChange={onLabelVisibilityChange} onLabelRotationChange={onLabelRotationChange} />
          <MyMapsSymbolizer visible={activeTool === "symbolize"} item={item} />
          <MyMapsBuffer visible={activeTool === "buffer"} item={item} />
          <MyMapsMeasure visible={activeTool === "measure"} item={item} />
          <FooterButtons onTools={onTools ? (event) => onTools(item, event) : undefined} onDelete={onDelete ? () => onDelete(item) : undefined} onClose={onClose} />
        </div>
      </div>
    </>,
    overlayElementRef.current,
  );
};

export default DrawingOptionsPopup;

"use client";

import { useEffect, useRef, useCallback } from "react";
import { Overlay } from "ol";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./MapPopup.css";

export default function MapPopup() {
  const { map } = useMapStore();
  const { setOverlay, isVisible, features, selectedIndex, hide, nextFeature, prevFeature } = usePopupStore();
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const activeInteractionIdsRef = useRef<number[]>([]);
  const hasBeenDraggedRef = useRef<boolean>(false);

  // Initialize overlay
  useEffect(() => {
    if (!map || !popupRef.current || overlayRef.current) return;

    const overlay = new Overlay({
      element: popupRef.current,
      autoPan: false, // Don't automatically pan the map when popup opens
      positioning: "bottom-center",
      stopEvent: true, // Prevent map interactions when interacting with popup
      offset: [0, -10],
    });

    map.addOverlay(overlay);
    overlayRef.current = overlay;
    setOverlay(overlay);

    return () => {
      if (overlayRef.current) {
        map.removeOverlay(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, setOverlay]);

  // Disable/enable map interactions on popup mouseover/mouseout (matches legacy Popup.jsx pattern)
  useEffect(() => {
    if (!map || !popupRef.current || !isVisible) return;

    const container = popupRef.current;

    const handleMouseOver = () => {
      activeInteractionIdsRef.current = [];
      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          activeInteractionIdsRef.current.push((interaction as unknown as { ol_uid: number }).ol_uid);
        }
        interaction.setActive(false);
      });
      (window as unknown as { popupActive: boolean }).popupActive = true;
    };

    const handleMouseOut = () => {
      map.getInteractions().forEach((interaction) => {
        const uid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(uid)) {
          interaction.setActive(true);
        }
      });
      activeInteractionIdsRef.current = [];
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };

    container.onmouseover = handleMouseOver;
    container.onmouseout = handleMouseOut;

    return () => {
      container.onmouseover = null;
      container.onmouseout = null;
      // Restore interactions on cleanup
      if (activeInteractionIdsRef.current.length > 0) {
        map.getInteractions().forEach((interaction) => {
          const uid = (interaction as unknown as { ol_uid: number }).ol_uid;
          if (activeInteractionIdsRef.current.includes(uid)) {
            interaction.setActive(true);
          }
        });
        activeInteractionIdsRef.current = [];
      }
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };
  }, [map, isVisible]);

  // Drag handler for popup header (matches legacy Popup.jsx implementation)
  const setupDrag = useCallback(() => {
    const header = headerRef.current;
    if (!header || !map || !overlayRef.current) return;

    let isMoving = false;

    const handleMouseDown = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;

      // Ignore close button clicks
      if (target.closest(".sc-map-popup-close") || target.closest(".sc-map-popup-nav-btn")) {
        return;
      }

      // Ignore on mobile/touch
      if ("ontouchstart" in window && window.innerWidth < 768) {
        return;
      }

      evt.preventDefault();
      isMoving = false;

      const overlay = overlayRef.current!;

      // Capture the pixel offset between the mouse click and the overlay's
      // current anchor position so the popup doesn't jump when dragging starts.
      const overlayPos = overlay.getPosition();
      const anchorPixel = overlayPos ? map.getPixelFromCoordinate(overlayPos) : null;
      const clickPixel = map.getEventPixel(evt);
      // offsetX/Y = how far the click is from the anchor, in screen pixels
      const offsetX = anchorPixel ? clickPixel[0] - anchorPixel[0] : 0;
      const offsetY = anchorPixel ? clickPixel[1] - anchorPixel[1] : 0;

      const move = (moveEvt: MouseEvent) => {
        const mousePixel = map.getEventPixel(moveEvt);
        // Subtract the original offset so the anchor stays under the same
        // relative spot on the header where the user grabbed it.
        const newAnchorPixel = [mousePixel[0] - offsetX, mousePixel[1] - offsetY];
        const point = map.getCoordinateFromPixel(newAnchorPixel);

        if (isMoving) {
          overlay.setPosition(point);
          hasBeenDraggedRef.current = true;
        } else {
          isMoving = true;
        }
      };

      const end = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", end);
        isMoving = false;
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
    };

    header.addEventListener("mousedown", handleMouseDown);

    return () => {
      header.removeEventListener("mousedown", handleMouseDown);
    };
  }, [map]);

  // Attach drag handler when header is available and popup is visible
  useEffect(() => {
    if (!isVisible) {
      hasBeenDraggedRef.current = false;
      return;
    }
    const cleanup = setupDrag();
    return cleanup;
  }, [isVisible, setupDrag]);

  if (!isVisible || features.length === 0) {
    return (
      <div ref={popupRef} className="sc-map-popup" style={{ display: "none" }}>
        <div className="sc-map-popup-content"></div>
      </div>
    );
  }

  const currentFeature = features[selectedIndex];
  const hasMultipleFeatures = features.length > 1;

  return (
    <div ref={popupRef} className="sc-map-popup">
      <div ref={headerRef} className="sc-map-popup-header sc-no-select">
        <h3 className="sc-map-popup-title">{currentFeature.title}</h3>
        <button className="sc-map-popup-close" onClick={hide} aria-label="Close popup">
          ×
        </button>
      </div>

      {/* Feature navigation for multiple features */}
      {hasMultipleFeatures && (
        <div className="sc-map-popup-nav">
          <button className="sc-map-popup-nav-btn" onClick={prevFeature} aria-label="Previous feature">
            <FaChevronLeft size={12} />
          </button>
          <span className="sc-map-popup-nav-count">
            {selectedIndex + 1} of {features.length}
          </span>
          <button className="sc-map-popup-nav-btn" onClick={nextFeature} aria-label="Next feature">
            <FaChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Layer name badge if available */}
      {currentFeature.layerName && <div className="sc-map-popup-layer-badge">{currentFeature.layerName}</div>}

      <div className="sc-map-popup-content">{currentFeature.content}</div>
    </div>
  );
}

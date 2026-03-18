"use client";

import { useEffect, useRef, useCallback } from "react";
import { Overlay } from "ol";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useReportsStore } from "@/stores/reportsStore";
import { activateTab } from "@/utils/helpersUI";
import { FaChevronLeft, FaChevronRight, FaExternalLinkAlt } from "react-icons/fa";
import PopupReportContent from "@/components/PopupReportContent";
import ReportsFeatureList from "@/components/ReportsFeatureList";
import type { Result } from "@/components/ResultsPopup";
import "./MapPopup.css";

export default function MapPopup() {
  const { map } = useMapStore();
  const { setOverlay, isVisible, features, selectedIndex, hide, nextFeature, prevFeature, coordinates } = usePopupStore();
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

  // Disable/enable map interactions when mouse enters/leaves the popup.
  // Uses mouseenter/mouseleave (not mouseover/mouseout) to avoid spurious
  // events from child elements bubbling up, which was causing
  // activeInteractionIdsRef to be reset while interactions were still disabled,
  // permanently locking out map interactions after closing the popup.
  useEffect(() => {
    if (!map || !popupRef.current || !isVisible) return;

    const container = popupRef.current;
    let interactionsDisabled = false;

    const handleMouseEnter = () => {
      if (interactionsDisabled) return; // Already disabled, nothing to do
      activeInteractionIdsRef.current = [];
      map.getInteractions().forEach((interaction) => {
        if (interaction.getActive()) {
          activeInteractionIdsRef.current.push((interaction as unknown as { ol_uid: number }).ol_uid);
        }
        interaction.setActive(false);
      });
      interactionsDisabled = true;
      (window as unknown as { popupActive: boolean }).popupActive = true;
    };

    const handleMouseLeave = () => {
      if (!interactionsDisabled) return; // Nothing to restore
      map.getInteractions().forEach((interaction) => {
        const uid = (interaction as unknown as { ol_uid: number }).ol_uid;
        if (activeInteractionIdsRef.current.includes(uid)) {
          interaction.setActive(true);
        }
      });
      activeInteractionIdsRef.current = [];
      interactionsDisabled = false;
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };

    const restoreAllInteractions = () => {
      // Unconditionally re-enable all interactions — used on cleanup to
      // guarantee we never leave the map in a disabled state.
      map.getInteractions().forEach((interaction) => {
        interaction.setActive(true);
      });
      activeInteractionIdsRef.current = [];
      interactionsDisabled = false;
      (window as unknown as { popupActive: boolean }).popupActive = false;
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      restoreAllInteractions();
    };
  }, [map, isVisible]);

  // Drag handler for popup header (matches legacy Popup.jsx implementation)
  const setupDrag = useCallback(() => {
    const header = headerRef.current;
    if (!header || !map || !overlayRef.current) return;

    let isMoving = false;

    const handleMouseDown = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;

      // Ignore close / popout button clicks
      if (target.closest("button")) {
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

  // Auto-pan: when the popup first opens (new coordinates), wait for it to
  // render, measure its bounds against the map viewport, and smoothly pan
  // the map so the popup is fully visible. Skipped after user drags.
  useEffect(() => {
    if (!isVisible || !map || !popupRef.current || !coordinates || hasBeenDraggedRef.current) return;

    // Wait two frames so the overlay element has its final size/position.
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || !popupRef.current || !map) return;

        const popupEl = popupRef.current;
        const mapEl = map.getTargetElement() as HTMLElement | null;
        if (!mapEl) return;

        const mapRect = mapEl.getBoundingClientRect();
        const popupRect = popupEl.getBoundingClientRect();

        const margin = 20; // px padding from viewport edges
        let deltaX = 0;
        let deltaY = 0;

        // Check each edge
        if (popupRect.top < mapRect.top + margin) {
          deltaY = mapRect.top + margin - popupRect.top; // need to pan map down (negative pixel shift)
        } else if (popupRect.bottom > mapRect.bottom - margin) {
          deltaY = mapRect.bottom - margin - popupRect.bottom; // pan map up
        }

        if (popupRect.left < mapRect.left + margin) {
          deltaX = mapRect.left + margin - popupRect.left; // pan map right
        } else if (popupRect.right > mapRect.right - margin) {
          deltaX = mapRect.right - margin - popupRect.right; // pan map left
        }

        if (deltaX === 0 && deltaY === 0) return; // fully visible, no pan needed

        // Convert pixel delta to map coordinates
        const view = map.getView();
        const center = view.getCenter();
        if (!center) return;

        const centerPixel = map.getPixelFromCoordinate(center);
        const newCenterPixel = [centerPixel[0] - deltaX, centerPixel[1] - deltaY];
        const newCenter = map.getCoordinateFromPixel(newCenterPixel);

        view.animate({ center: newCenter, duration: 250 });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isVisible, coordinates, map]);

  if (!isVisible || features.length === 0) {
    return (
      <div ref={popupRef} className="map-popup" style={{ display: "none" }}>
        <div className="p-1.5 max-h-[350px] overflow-y-auto overscroll-contain touch-pan-y"></div>
      </div>
    );
  }

  const currentFeature = features[selectedIndex];
  const hasMultipleFeatures = features.length > 1;

  /** Pop current popup content out to the sidebar Reports tab. */
  const handlePopOut = () => {
    const popupState = usePopupStore.getState();
    const rawResults = popupState.rawResults as Result[] | null;

    // If we have the original Result[] (multi-feature click), use the collapsible list
    if (rawResults && rawResults.length > 0) {
      const title = rawResults.length > 1 ? `${rawResults.length} Features` : rawResults[0]?.displayName || "Result";
      useReportsStore.getState().setReport({
        id: `popup-popout-${Date.now()}`,
        title,
        content: <ReportsFeatureList results={rawResults} onClose={() => hide()} />,
        createdAt: new Date(),
        source: "popupPopOut",
      });
    } else {
      // Fallback: use PopupReportContent for non-interaction popups
      const popupFeatures = popupState.features;
      const popupIndex = popupState.selectedIndex;
      const title = popupFeatures.length > 1 ? `Results (${popupFeatures.length})` : popupFeatures[0]?.title || "Result";
      useReportsStore.getState().setReport({
        id: `popup-popout-${Date.now()}`,
        title,
        content: <PopupReportContent features={popupFeatures} initialSelectedIndex={popupIndex} />,
        createdAt: new Date(),
        source: "popupPopOut",
      });
    }

    activateTab("reports");
    hide();
  };

  return (
    <div ref={popupRef} className="map-popup">
      <div
        ref={headerRef}
        className="flex justify-between items-center h-[25px] p-1.5 bg-[image:linear-gradient(to_bottom,#3980cc,#2865a2)] border-b-2 border-b-accent text-white cursor-grab active:cursor-grabbing text-[15px] rounded-t select-none"
      >
        <h3 className="m-0 text-[15px] font-normal text-white flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{currentFeature.title}</h3>
        <button
          className="bg-transparent border-none text-sm leading-none text-white cursor-pointer p-0 w-[22px] h-[22px] flex items-center justify-center rounded-[3px] transition-all duration-200 shrink-0 hover:bg-white/20"
          onClick={handlePopOut}
          aria-label="Pop out to Reports tab"
          title="Pop out to Reports tab"
        >
          <FaExternalLinkAlt size={11} />
        </button>
        <button
          className="bg-transparent border-none text-[22px] leading-none text-white cursor-pointer p-0 w-[22px] h-[22px] flex items-center justify-center rounded-[3px] transition-all duration-200 shrink-0 hover:bg-white/20"
          onClick={hide}
          aria-label="Close popup"
        >
          ×
        </button>
      </div>

      {/* Feature navigation for multiple features */}
      {hasMultipleFeatures && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-2.5 bg-[#f0f0f0] border-b border-[#e0e0e0]">
          <button
            className="bg-white border border-[#ddd] rounded py-1 px-2 cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-[#e8e8e8] hover:border-[#ccc]"
            onClick={prevFeature}
            aria-label="Previous feature"
          >
            <FaChevronLeft size={12} />
          </button>
          <span className="text-xs text-[#666] font-medium min-w-[60px] text-center">
            {selectedIndex + 1} of {features.length}
          </span>
          <button
            className="bg-white border border-[#ddd] rounded py-1 px-2 cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-[#e8e8e8] hover:border-[#ccc]"
            onClick={nextFeature}
            aria-label="Next feature"
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Layer name badge if available */}
      {currentFeature.layerName && <div className="text-[10px] text-[#666] bg-[#e8f4fd] border-b border-[#d0e8f7] py-1 px-2.5 font-medium">{currentFeature.layerName}</div>}

      <div className="p-1.5 max-h-[350px] overflow-y-auto overscroll-contain touch-pan-y">{currentFeature.content}</div>
    </div>
  );
}

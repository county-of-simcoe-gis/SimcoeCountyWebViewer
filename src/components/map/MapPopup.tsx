"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Overlay } from "ol";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useReportsStore } from "@/stores/reportsStore";
import { activateTab } from "@/utils/helpersUI";
import { FaChevronLeft, FaChevronRight, FaExternalLinkAlt, FaTimes } from "react-icons/fa";
import PopupReportContent from "@/components/PopupReportContent";
import ReportsFeatureList from "@/components/ReportsFeatureList";
import type { Result } from "@/components/ResultsPopup";
import { isMobile } from "@/utils/helpersBrowser";
import "./MapPopup.css";

export default function MapPopup() {
  const map = useMapStore((s) => s.map);
  const setOverlay = usePopupStore((s) => s.setOverlay);
  const isVisible = usePopupStore((s) => s.isVisible);
  const features = usePopupStore((s) => s.features);
  const selectedIndex = usePopupStore((s) => s.selectedIndex);
  const hide = usePopupStore((s) => s.hide);
  const nextFeature = usePopupStore((s) => s.nextFeature);
  const prevFeature = usePopupStore((s) => s.prevFeature);
  const coordinates = usePopupStore((s) => s.coordinates);
  // Detached container element owned by OpenLayers (NOT rendered in the React
  // tree). Using a portal into this element prevents React from trying to
  // remove a DOM node that OL has reparented into its overlay container, which
  // caused intermittent "Cannot read properties of null (reading 'removeChild')"
  // errors during commit on map clicks.
  const [popupEl, setPopupEl] = useState<HTMLDivElement | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const activeInteractionIdsRef = useRef<number[]>([]);
  const hasBeenDraggedRef = useRef<boolean>(false);

  // Create the detached popup container element once on the client.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.className = "map-popup";
    setPopupEl(el);
    return () => {
      // Detach from any parent OL may have appended it to.
      el.parentNode?.removeChild(el);
    };
  }, []);

  // Initialize overlay
  useEffect(() => {
    if (!map || !popupEl || overlayRef.current) return;

    const overlay = new Overlay({
      element: popupEl,
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
  }, [map, popupEl, setOverlay]);

  // Disable/enable map interactions when mouse enters/leaves the popup.
  // Uses mouseenter/mouseleave (not mouseover/mouseout) to avoid spurious
  // events from child elements bubbling up, which was causing
  // activeInteractionIdsRef to be reset while interactions were still disabled,
  // permanently locking out map interactions after closing the popup.
  useEffect(() => {
    if (!map || !popupEl || !isVisible) return;

    const container = popupEl;
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
  }, [map, popupEl, isVisible]);

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
  // On mobile the popup is a fixed-position bottom sheet, so auto-pan is unnecessary.
  useEffect(() => {
    if (!isVisible || !map || !popupEl || !coordinates || hasBeenDraggedRef.current || isMobile()) return;

    // Wait two frames so the overlay element has its final size/position.
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || !popupEl || !map) return;

        const mapEl = map.getTargetElement() as HTMLElement | null;
        if (!mapEl) return;

        const mapRect = mapEl.getBoundingClientRect();
        const popupRect = popupEl.getBoundingClientRect();

        const margin = 20; // px padding from viewport edges

        // Account for popup sidebar on the left (desktop only) since the popup can extend underneath it and be cut off. The sidebar is 220px wide, but we add a small margin to ensure the popup isn't flush against the sidebar edge. On mobile the sidebar is hidden when the popup is open, so no need to account for it.
        const sidebarOffset = 220;

        let deltaX = 0;
        let deltaY = 0;

        // Check each edge
        if (popupRect.top < mapRect.top + margin) {
          deltaY = mapRect.top + margin - popupRect.top; // need to pan map down (negative pixel shift)
        } else if (popupRect.bottom > mapRect.bottom - margin) {
          deltaY = mapRect.bottom - margin - popupRect.bottom; // pan map up
        }

        if (popupRect.left < mapRect.left + sidebarOffset + margin) {
          deltaX = mapRect.left + sidebarOffset + margin - popupRect.left; // pan map right
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
  }, [isVisible, coordinates, map, popupEl]);

  // Toggle visibility on the detached container (OL also hides via
  // setPosition(undefined), but this guarantees the empty shell isn't visible).
  // On mobile the popup is rendered directly in the React tree, so always hide
  // the OL overlay element to prevent a phantom empty box on the map.
  useEffect(() => {
    if (!popupEl) return;
    if (isMobile()) {
      popupEl.style.display = "none";
    } else {
      popupEl.style.display = isVisible && features.length > 0 ? "" : "none";
    }
  }, [popupEl, isVisible, features.length]);

  if (!popupEl) return null;

  if (!isVisible || features.length === 0) {
    return createPortal(<div className="p-1.5 max-h-[350px] overflow-y-auto overscroll-contain touch-pan-y"></div>, popupEl);
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

  // Shared popup content used by both desktop (OL overlay portal) and mobile (fixed bottom sheet)
  const popupContent = (
    <>
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
          <FaTimes />
        </button>
      </div>

      {/* Feature navigation for multiple features */}
      {hasMultipleFeatures && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-2.5 bg-base-200 border-b border-base-300">
          <button
            className="bg-base-100 border border-base-300 rounded py-1 px-2 cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-base-300 hover:border-base-content/30"
            onClick={prevFeature}
            aria-label="Previous feature"
          >
            <FaChevronLeft size={12} />
          </button>
          <span className="text-xs text-base-content/70 font-medium min-w-[60px] text-center">
            {selectedIndex + 1} of {features.length}
          </span>
          <button
            className="bg-base-100 border border-base-300 rounded py-1 px-2 cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-base-300 hover:border-base-content/30"
            onClick={nextFeature}
            aria-label="Next feature"
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Layer name badge if available */}
      {currentFeature.layerName && <div className="text-[10px] text-base-content/70 bg-info/10 border-b border-info/20 py-1 px-2.5 font-medium">{currentFeature.layerName}</div>}

      <div className="p-1.5 max-h-[350px] max-[770px]:max-h-[35vh] overflow-y-auto overscroll-contain touch-pan-y">{currentFeature.content}</div>
    </>
  );

  // On mobile, render the popup as a fixed bottom sheet directly in the React
  // tree instead of portalling into the OL overlay element. OL's overlay
  // containers use CSS transform for positioning which breaks position:fixed
  // on descendant elements, so we bypass the overlay entirely on mobile.
  if (isMobile()) {
    return <div className="fixed bottom-0 left-0 right-0 z-[1001] bg-base-100 rounded-t-lg shadow-[0_-2px_12px_rgba(0,0,0,0.2)] pointer-events-auto">{popupContent}</div>;
  }

  return createPortal(popupContent, popupEl);
}

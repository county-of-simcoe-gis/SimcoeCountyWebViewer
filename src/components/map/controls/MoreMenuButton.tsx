"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RxDropdownMenu } from "react-icons/rx";
import { useSidebarStore } from "@/stores/sidebarStore";
import { MapControlButton } from "@/components/ui/MapControlButton";

/**
 * Map control that toggles the global More Menu. Only visible when the sidebar
 * is open so it doesn't duplicate the "More" button inside the slim sidebar.
 * Hidden while the browser is in fullscreen mode.
 * Opens the menu anchored below the button.
 */
export const MoreMenuButton = React.memo(() => {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const isMoreMenuOpen = useSidebarStore((s) => s.isMoreMenuOpen);
  const openMoreMenuAtMapControl = useSidebarStore((s) => s.openMoreMenuAtMapControl);
  const closeMoreMenu = useSidebarStore((s) => s.closeMoreMenu);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsFullscreen(!!document.fullscreenElement);
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  // Close the menu if it was open when entering fullscreen
  useEffect(() => {
    if (isFullscreen && isMoreMenuOpen) closeMoreMenu();
  }, [isFullscreen, isMoreMenuOpen, closeMoreMenu]);

  const handleClick = useCallback(() => {
    if (isMoreMenuOpen) {
      closeMoreMenu();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      openMoreMenuAtMapControl({ top: rect.bottom + 4, left: rect.left });
    } else {
      openMoreMenuAtMapControl({ top: 100, left: 10 });
    }
  }, [isMoreMenuOpen, closeMoreMenu, openMoreMenuAtMapControl]);

  // Only show when sidebar is open and not in fullscreen
  if (!isOpen || isFullscreen) return null;

  return (
    <div ref={buttonRef}>
      <MapControlButton onClick={handleClick} title="More options" className={`!w-[100px] !h-[30px] ${isMoreMenuOpen ? "ring-2 ring-primary/50" : ""}`}>
        <RxDropdownMenu size={20} className="text-base-content pointer-events-none" />
        <span className="text-sm text-base-content pointer-events-none">More</span>
      </MapControlButton>
    </div>
  );
});

MoreMenuButton.displayName = "MoreMenuButton";

export default MoreMenuButton;

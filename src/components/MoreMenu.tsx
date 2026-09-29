"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useLegendStore } from "@/stores/legendStore";
import { useMapStore } from "@/stores/mapStore";
import { useTOCStore } from "@/stores/tocStore";
import { useAppStore } from "@/stores/appStore";
import { FaCamera, FaCommentDots, FaMap, FaQuestionCircle, FaFileContract, FaNewspaper, FaPalette, FaTools, FaDrawPolygon } from "react-icons/fa";
import { showFeedbackWindow } from "@/utils/mapHelpers";
import { showURLWindow, showHelpWindow } from "@/utils/helpersUI";
import { MenuList, MenuItem, MenuHeading } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

interface MenuItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export default function MoreMenu() {
  const isMoreMenuOpen = useSidebarStore((s) => s.isMoreMenuOpen);
  const closeMoreMenu = useSidebarStore((s) => s.closeMoreMenu);
  const themes = useSidebarStore((s) => s.themes);
  const tools = useSidebarStore((s) => s.tools);
  const openSidebar = useSidebarStore((s) => s.openSidebar);
  const requestActivateSidebarItem = useSidebarStore((s) => s.requestActivateSidebarItem);
  const setActiveTabByName = useSidebarStore((s) => s.setActiveTabByName);
  const hideTools = useSidebarStore((s) => s.hideTools);
  const hideThemes = useSidebarStore((s) => s.hideThemes);
  const hideMyMaps = useSidebarStore((s) => s.hideMyMaps);
  const moreMenuAnchor = useSidebarStore((s) => s.moreMenuAnchor);
  const moreMenuPosition = useSidebarStore((s) => s.moreMenuPosition);
  const openLegend = useLegendStore((s) => s.openLegend);
  const map = useMapStore((s) => s.map);
  const config = useAppStore((state) => state.config);
  const { data: session } = useSession();

  // Filter out secure items when user is not authenticated (match Sidebar behavior)
  const visibleThemes = useMemo(() => (session ? themes : themes.filter((t) => !t.secure)), [themes, session]);
  const visibleTools = useMemo(() => (session ? tools : tools.filter((t) => !t.secure)), [tools, session]);

  // Close menu on Escape key
  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMoreMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMoreMenuOpen, closeMoreMenu]);

  // Handle item click
  const handleItemClick = useCallback(
    (name: string, type: "tools" | "themes") => {
      closeMoreMenu();
      openSidebar();
      // Delegate to Sidebar's pendingActivation handler, which resolves the item by name,
      // switches to the correct (visible) tab, and mounts the tool/theme component.
      requestActivateSidebarItem(name, type);
    },
    [closeMoreMenu, openSidebar, requestActivateSidebarItem],
  );

  // Handle My Maps click
  const handleMyMapsClick = useCallback(() => {
    closeMoreMenu();
    openSidebar();
    setActiveTabByName("mymaps");
  }, [closeMoreMenu, openSidebar, setActiveTabByName]);

  // Handle screenshot — composites every layer canvas in the map viewport into
  // a single PNG and downloads it. OpenLayers may use more than one <canvas>
  // (e.g. one for raster tile basemaps, another for vector tile / decluttered
  // layers), so we must iterate all of them and draw each into an export
  // canvas at its current CSS transform. Based on the official OL export-map
  // example: https://openlayers.org/en/latest/examples/export-map.html
  //
  // Caveat: if any layer source serves tiles without CORS, the canvas becomes
  // tainted and toDataURL() throws a SecurityError.
  const handleScreenshot = useCallback(() => {
    if (!map) return;

    map.once("rendercomplete", () => {
      const size = map.getSize();
      if (!size) return;

      const mapCanvas = document.createElement("canvas");
      mapCanvas.width = size[0];
      mapCanvas.height = size[1];
      const mapContext = mapCanvas.getContext("2d");
      if (!mapContext) return;

      // Fill opaque white first — some basemap styles (e.g. ESRI World
      // Topographic Canadian Style) have no "background" layer, so the VT
      // layer canvas is transparent between features. Without this, the PNG
      // exports with transparent pixels that render as black in many viewers.
      mapContext.fillStyle = "#ffffff";
      mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

      const viewport = map.getViewport();
      const canvases = viewport.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas, canvas.ol-layer");

      canvases.forEach((canvas) => {
        if (canvas.width <= 0) return;

        const parent = canvas.parentNode as HTMLElement | null;
        const opacity = (parent && parent.style.opacity) || canvas.style.opacity;
        mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);

        let matrix: number[];
        const transform = canvas.style.transform;
        const match = transform ? transform.match(/^matrix\(([^(]*)\)$/) : null;
        if (match) {
          matrix = match[1].split(",").map(Number);
        } else {
          matrix = [parseFloat(canvas.style.width) / canvas.width || 1, 0, 0, parseFloat(canvas.style.height) / canvas.height || 1, 0, 0];
        }
        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);

        const backgroundColor = parent?.style.backgroundColor;
        if (backgroundColor) {
          mapContext.fillStyle = backgroundColor;
          mapContext.fillRect(0, 0, canvas.width, canvas.height);
        }
        mapContext.drawImage(canvas, 0, 0);
      });

      mapContext.globalAlpha = 1;
      mapContext.setTransform(1, 0, 0, 1, 0, 0);

      try {
        const link = document.createElement("a");
        link.download = "map.png";
        link.href = mapCanvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Screenshot export failed (canvas may be tainted by cross-origin tiles):", err);
      }
    });

    map.renderSync();
    closeMoreMenu();
  }, [map, closeMoreMenu]);

  // Handle legend
  const handleLegend = useCallback(async () => {
    closeMoreMenu();

    const tocState = useTOCStore.getState();
    const tocType = tocState.tocType;
    const allGroupsData = tocType === "LIST" ? tocState.layerListGroups : tocState.layerFolderGroups;

    // Convert to legend group format with all layers
    const allGroups = allGroupsData.map((group) => ({
      label: group.label,
      value: group.value,
      layers: group.layers,
    }));

    let groupsToSelect;

    if (tocType === "LIST") {
      // In list view, pre-select the currently active group
      const { selectedGroup } = tocState;
      if (selectedGroup) {
        const activeGroup = allGroups.find((group) => group.value === selectedGroup.value);
        groupsToSelect = activeGroup ? [activeGroup] : allGroups;
      } else {
        groupsToSelect = allGroups;
      }
    } else {
      // In folder view, pre-select groups that have visible layers
      const allVisibleLayers = tocState.getAllVisibleLayers();
      const visibleGroupValues = new Set(allVisibleLayers.map((layer) => layer.group));
      const selectedGroups = allGroups.filter((group) => visibleGroupValues.has(group.value));
      groupsToSelect = selectedGroups.length > 0 ? selectedGroups : allGroups;
    }

    openLegend(allGroups as never[], groupsToSelect as never[]);
  }, [closeMoreMenu, openLegend]);

  // Handle URL window
  const openURLWindow = useCallback(
    (url: string, title: string) => {
      showURLWindow(url, false, "normal", false, false, title);
      closeMoreMenu();
    },
    [closeMoreMenu],
  );

  // Handle feedback
  const handleFeedback = useCallback(() => {
    if (!config?.feedbackUrl) return;
    showFeedbackWindow(map, config.feedbackUrl, { mapId: config.mapId });
    closeMoreMenu();
  }, [config, map, closeMoreMenu]);

  // Get tools
  const getTools = (): MenuItem[] => {
    const toolItems: MenuItem[] = [];

    // Add configured tools (respect hideTools flag)
    if (!hideTools) {
      visibleTools.forEach((tool) => {
        if (tool.enabled) {
          toolItems.push({
            id: tool.id,
            name: tool.name,
            icon: <FaTools />,
            onClick: () => handleItemClick(tool.name, "tools"),
          });
        }
      });
    }

    return toolItems;
  };

  // Get themes
  const getThemes = (): MenuItem[] => {
    if (hideThemes) return [];
    return visibleThemes
      .filter((theme) => theme.enabled)
      .map((theme) => ({
        id: theme.id,
        name: theme.name,
        icon: <FaPalette />,
        onClick: () => handleItemClick(theme.name, "themes"),
      }));
  };

  // Get other items
  const getOthers = (): MenuItem[] => {
    const items: MenuItem[] = [];

    // What's New
    if (config?.whatsNewUrl) {
      items.push({
        id: "whats-new",
        name: "What's New",
        icon: <FaNewspaper />,
        onClick: () => openURLWindow(config.whatsNewUrl, "What's New"),
      });
    }

    // Feedback
    if (config?.feedbackUrl && !config?.showHelpButtonInsteadOfFeedback) {
      items.push({
        id: "feedback",
        name: "Feedback",
        icon: <FaCommentDots />,
        onClick: handleFeedback,
      });
    }

    // Map Legend
    items.push({
      id: "legend",
      name: "Map Legend",
      icon: <FaMap />,
      onClick: handleLegend,
    });

    // Help
    items.push({
      id: "help",
      name: "Help",
      icon: <FaQuestionCircle />,
      onClick: () => showHelpWindow(),
    });

    // Terms and Conditions
    if (config?.termsUrl) {
      items.push({
        id: "terms",
        name: "Terms and Conditions",
        icon: <FaFileContract />,
        onClick: () => openURLWindow(config.termsUrl, "Terms and Conditions"),
      });
    }

    return items;
  };

  const themeItems = getThemes();
  const toolItems = getTools();
  const otherItems = getOthers();

  const menuContent = isMoreMenuOpen ? (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div className="fixed inset-0 z-[9999]" onClick={closeMoreMenu} />
      <MenuList
        className={moreMenuAnchor === "mapControl" ? "fixed w-[200px] max-h-[400px] z-[10000]" : "absolute bottom-[70px] left-0 w-[200px] max-h-[400px] mt-0.5"}
        style={moreMenuAnchor === "mapControl" && moreMenuPosition ? { top: moreMenuPosition.top, left: moreMenuPosition.left } : undefined}
      >
        {/* Pinned: Take a Screenshot */}
        <MenuItem icon={<FaCamera />} onClick={handleScreenshot}>
          Take a Screenshot
        </MenuItem>

        {/* Map Themes */}
        {themeItems.length > 0 && (
          <>
            <MenuHeading>MAP THEMES</MenuHeading>
            {themeItems.map((item) => (
              <MenuItem key={item.id} icon={item.icon} onClick={item.onClick}>
                {item.name}
              </MenuItem>
            ))}
          </>
        )}

        {/* Map Tools */}
        {toolItems.length > 0 && (
          <>
            <MenuHeading>MAP TOOLS</MenuHeading>
            {toolItems.map((item) => (
              <MenuItem key={item.id} icon={item.icon} onClick={item.onClick}>
                {item.name}
              </MenuItem>
            ))}
          </>
        )}

        {/* My Maps */}
        {!hideMyMaps && (
          <>
            <MenuHeading>MY MAPS</MenuHeading>
            <MenuItem icon={<FaDrawPolygon />} onClick={handleMyMapsClick}>
              My Maps
            </MenuItem>
          </>
        )}

        {/* Other */}
        {otherItems.length > 0 && (
          <>
            <MenuHeading>OTHER</MenuHeading>
            {otherItems.map((item) => (
              <MenuItem key={item.id} icon={item.icon} onClick={item.onClick}>
                {item.name}
              </MenuItem>
            ))}
          </>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />
      </MenuList>
    </>
  ) : null;

  return typeof document !== "undefined"
    ? createPortal(
        <>{menuContent}</>,

        document.body,
      )
    : null;
}

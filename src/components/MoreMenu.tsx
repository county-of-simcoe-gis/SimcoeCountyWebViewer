"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useLegendStore } from "@/stores/legendStore";
import { useHelpModalStore } from "@/stores/helpModalStore";
import { useMapStore } from "@/stores/mapStore";
import { useTOCStore } from "@/stores/tocStore";
import { useAppStore } from "@/stores/appStore";
import { FaCamera, FaCommentDots, FaMap, FaQuestionCircle, FaFileContract, FaNewspaper, FaPalette, FaTools, FaDrawPolygon } from "react-icons/fa";
import URLModal from "@/components/common/URLModal";
import { showFeedbackWindow } from "@/utils/mapHelpers";
import "./MoreMenu.css";

interface MenuItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export default function MoreMenu() {
  const { isMoreMenuOpen, closeMoreMenu, themes, tools, openSidebar, activateSidebarItem, setActiveTab } = useSidebarStore();
  const { openLegend } = useLegendStore();
  const { map } = useMapStore();
  const { layers } = useTOCStore();
  const config = useAppStore((state) => state.config);
  const menuRef = useRef<HTMLDivElement>(null);

  // URL Modal state
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlModalUrl, setUrlModalUrl] = useState("");
  const [urlModalTitle, setUrlModalTitle] = useState("");

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on the menu itself or elements with sc-menu- class
      if (menuRef.current && !menuRef.current.contains(target) && !target.className?.toString().includes("sc-menu-")) {
        closeMoreMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMoreMenu();
      }
    };

    // Add listeners after a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMoreMenuOpen, closeMoreMenu]);

  // Handle item click
  const handleItemClick = useCallback(
    (name: string, type: "tools" | "themes") => {
      closeMoreMenu();
      activateSidebarItem(name, type);
      openSidebar();
      // Set appropriate tab based on type
      if (type === "tools") {
        setActiveTab(1); // Tools tab
      } else if (type === "themes") {
        setActiveTab(3); // Themes tab
      }
    },
    [closeMoreMenu, activateSidebarItem, openSidebar, setActiveTab],
  );

  // Handle My Maps click
  const handleMyMapsClick = useCallback(() => {
    closeMoreMenu();
    openSidebar();
    setActiveTab(2); // My Maps tab
  }, [closeMoreMenu, openSidebar, setActiveTab]);

  // Handle screenshot
  const handleScreenshot = useCallback(() => {
    if (!map) return;

    map.once("rendercomplete", function () {
      const mapCanvas = document.createElement("canvas");
      const size = map.getSize();
      if (!size) return;

      mapCanvas.width = size[0];
      mapCanvas.height = size[1];
      const mapContext = mapCanvas.getContext("2d");
      if (!mapContext) return;

      Array.prototype.forEach.call(map.getViewport().querySelectorAll(".ol-layer canvas, canvas.ol-layer"), function (canvas: HTMLCanvasElement) {
        if (canvas.width > 0) {
          const opacity = (canvas.parentNode as HTMLElement)?.style.opacity || canvas.style.opacity;
          mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
          let matrix;
          const transform = canvas.style.transform;
          if (transform) {
            // Get the transform parameters from the style's transform matrix
            matrix = transform
              .match(/^matrix\(([^(]*)\)$/)?.[1]
              .split(",")
              .map(Number);
          } else {
            matrix = [parseFloat(canvas.style.width) / canvas.width, 0, 0, parseFloat(canvas.style.height) / canvas.height, 0, 0];
          }
          if (matrix) {
            // Apply the transform to the export map context
            mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
          }
          const backgroundColor = (canvas.parentNode as HTMLElement)?.style.backgroundColor;
          if (backgroundColor) {
            mapContext.fillStyle = backgroundColor;
            mapContext.fillRect(0, 0, canvas.width, canvas.height);
          }
          mapContext.drawImage(canvas, 0, 0);
        }
      });
      mapContext.globalAlpha = 1;
      mapContext.setTransform(1, 0, 0, 1, 0, 0);
      const link = document.createElement("a");
      link.download = "map.png";
      link.href = mapCanvas.toDataURL();
      link.click();
    });

    map.renderSync();
    closeMoreMenu();
  }, [map, closeMoreMenu]);

  // Handle legend
  const handleLegend = useCallback(() => {
    closeMoreMenu();

    // Get visible layers grouped by group
    const visibleLayers = layers.filter((layer) => layer.visible);
    const groupedLayers = visibleLayers.reduce(
      (acc, layer) => {
        const groupName = layer.groupName || layer.group || "Other";
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(layer);
        return acc;
      },
      {} as Record<string, typeof layers>,
    );

    // Convert to legend groups
    const allGroups = Object.entries(groupedLayers).map(([groupName, groupLayers]) => ({
      label: groupName.replace(/_/g, " "),
      value: groupName,
      layers: groupLayers,
    }));

    openLegend(allGroups, allGroups);
  }, [closeMoreMenu, openLegend, layers]);

  // Handle URL modal
  const showURLWindow = useCallback(
    (url: string, title: string) => {
      setUrlModalUrl(url);
      setUrlModalTitle(title);
      setUrlModalOpen(true);
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

    // Add screenshot first
    toolItems.push({
      id: "screenshot",
      name: "Take a Screenshot",
      icon: <FaCamera />,
      onClick: handleScreenshot,
    });

    // Add configured tools
    tools.forEach((tool) => {
      if (tool.enabled) {
        toolItems.push({
          id: tool.id,
          name: tool.name,
          icon: <FaTools />,
          onClick: () => handleItemClick(tool.name, "tools"),
        });
      }
    });

    return toolItems;
  };

  // Get themes
  const getThemes = (): MenuItem[] => {
    return themes
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
        onClick: () => showURLWindow(config.whatsNewUrl, "What's New"),
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

    // Screenshot (duplicate here for "Other" section as in original)
    items.push({
      id: "screenshot-other",
      name: "Take a Screenshot",
      icon: <FaCamera />,
      onClick: handleScreenshot,
    });

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
      onClick: () => useHelpModalStore.getState().openHelp(),
    });

    // Terms and Conditions
    if (config?.termsUrl) {
      items.push({
        id: "terms",
        name: "Terms and Conditions",
        icon: <FaFileContract />,
        onClick: () => showURLWindow(config.termsUrl, "Terms and Conditions"),
      });
    }

    return items;
  };

  const themeItems = getThemes();
  const toolItems = getTools();
  const otherItems = getOthers();

  // Render modal separately so it persists when menu closes
  const modalContent = urlModalOpen && <URLModal url={urlModalUrl} title={urlModalTitle} isOpen={urlModalOpen} onClose={() => setUrlModalOpen(false)} />;

  const menuContent = isMoreMenuOpen ? (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div className="fixed inset-0 z-[9999]" onClick={closeMoreMenu} />
      <div ref={menuRef} className="sc-menu-button-list-container">
        {/* Map Themes */}
        {themeItems.length > 0 && (
          <>
            <div className="sc-menu-list-item-heading">MAP THEMES</div>
            {themeItems.map((item) => (
              <div key={item.id} className="sc-menu-list-item" onClick={item.onClick}>
                <div className="sc-menu-list-item-label">
                  {item.icon && <span className="sc-menu-list-item-icon">{item.icon}</span>}
                  {item.name}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Map Tools */}
        {toolItems.length > 0 && (
          <>
            <div className="sc-menu-list-item-heading">MAP TOOLS</div>
            {toolItems.map((item) => (
              <div key={item.id} className="sc-menu-list-item" onClick={item.onClick}>
                <div className="sc-menu-list-item-label">
                  {item.icon && <span className="sc-menu-list-item-icon">{item.icon}</span>}
                  {item.name}
                </div>
              </div>
            ))}
          </>
        )}

        {/* My Maps */}
        <div className="sc-menu-list-item-heading">MY MAPS</div>
        <div className="sc-menu-list-item" onClick={handleMyMapsClick}>
          <div className="sc-menu-list-item-label">
            <span className="sc-menu-list-item-icon">
              <FaDrawPolygon />
            </span>
            My Maps
          </div>
        </div>

        {/* Other */}
        {otherItems.length > 0 && (
          <>
            <div className="sc-menu-list-item-heading">OTHER</div>
            {otherItems.map((item) => (
              <div key={item.id} className="sc-menu-list-item" onClick={item.onClick}>
                <div className="sc-menu-list-item-label">
                  {item.icon && <span className="sc-menu-list-item-icon">{item.icon}</span>}
                  {item.name}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  ) : null;

  return typeof document !== "undefined"
    ? createPortal(
        <>
          {menuContent}
          {modalContent}
        </>,
        document.body,
      )
    : null;
}

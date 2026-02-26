"use client";

import Image from "next/image";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";

interface SlimButtonProps {
  title: string;
  icon: string;
  isSelected: boolean;
  isActive: boolean;
  hidden: boolean;
  onClick: () => void;
}

function SlimButton({ title, icon, isSelected, isActive, hidden, onClick }: SlimButtonProps) {
  if (hidden) return null;

  return (
    <div className={`sc-sidebar-slim-button-container ${isSelected ? "active" : ""}`} onClick={onClick}>
      {isActive && <span className="sc-sidebar-slim-button-dot" />}
      <button className="sc-sidebar-slim-button">
        <Image src={`/images/${icon}`} alt={title} width={32} height={32} />
        <span>{title}</span>
      </button>
    </div>
  );
}

export default function SidebarSlim() {
  const { isOpen, activeTab, openSidebar, setActiveTab, isMoreMenuOpen, toggleMoreMenu, hideLayers, hideTools, hideMyMaps, hideThemes, hideReports } = useSidebarStore();
  const { emitActivateTab } = useEventStore();

  // Only show when sidebar is closed
  if (isOpen) return null;

  // Build dynamic tab indices based on visible tabs
  const visibleTabs: { name: string; index: number }[] = [];
  let idx = 0;
  if (!hideLayers) visibleTabs.push({ name: "layers", index: idx++ });
  if (!hideTools) visibleTabs.push({ name: "tools", index: idx++ });
  if (!hideMyMaps) visibleTabs.push({ name: "mymaps", index: idx++ });
  if (!hideThemes) visibleTabs.push({ name: "themes", index: idx++ });
  if (!hideReports) visibleTabs.push({ name: "reports", index: idx++ });

  const getTabIndex = (name: string) => visibleTabs.find((t) => t.name === name)?.index ?? -1;

  const handleTabClick = (tabName: string, tabIndex: number) => {
    openSidebar();
    setActiveTab(tabIndex);
    emitActivateTab(tabName);
  };

  const handleMoreClick = () => {
    toggleMoreMenu();
  };

  return (
    <div className="sc-sidebar-slim-container">
      {!hideLayers && <SlimButton title="Layers" icon="legend-32x32.png" onClick={() => handleTabClick("layers", getTabIndex("layers"))} isSelected={activeTab === getTabIndex("layers")} isActive={false} hidden={false} />}
      {!hideTools && (
        <SlimButton
          title="Tools"
          icon="tools-32x32.png"
          onClick={() => handleTabClick("tools", getTabIndex("tools"))}
          isSelected={activeTab === getTabIndex("tools")}
          isActive={false}
          hidden={false}
        />
      )}
      {!hideMyMaps && (
        <SlimButton
          title="My Maps"
          icon="map-32x32.png"
          onClick={() => handleTabClick("mymaps", getTabIndex("mymaps"))}
          isSelected={activeTab === getTabIndex("mymaps")}
          isActive={false}
          hidden={false}
        />
      )}
      {!hideThemes && (
        <SlimButton
          title="Themes"
          icon="theme-32x32.png"
          onClick={() => handleTabClick("themes", getTabIndex("themes"))}
          isSelected={activeTab === getTabIndex("themes")}
          isActive={false}
          hidden={false}
        />
      )}
      {!hideReports && <SlimButton title="Reports" icon="report-32x32.png" onClick={() => handleTabClick("reports", getTabIndex("reports"))} isSelected={activeTab === getTabIndex("reports")} isActive={false} hidden={false} />}

      <div className="sc-sidebar-slim-footer-container">
        <div className={`sc-sidebar-slim-button-container ${isMoreMenuOpen ? "active" : ""}`} onClick={handleMoreClick}>
          <button className="sc-menu-more-button" title="More Options" style={{ pointerEvents: "none" }}>
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              version="1.1"
              viewBox="0 0 22 16"
              height="24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ pointerEvents: "none" }}
            >
              <path d="M0 3h14v3h-14v-3zM0 7h14v3h-14v-3zM0 11h14v3h-14v-3z"></path>
              <path d="M15.5 10l3-3 3 3z"></path>
            </svg>
            <span style={{ pointerEvents: "none" }}>More</span>
          </button>
        </div>
      </div>
    </div>
  );
}

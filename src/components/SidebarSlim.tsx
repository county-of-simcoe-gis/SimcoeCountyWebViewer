"use client";

import { useState } from "react";
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

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  themes: Array<{ id: string; name: string; imageName: string }>;
  tools: Array<{ id: string; name: string; imageName: string }>;
}

function MoreMenu({ isOpen, onClose, themes, tools }: MoreMenuProps) {
  if (!isOpen) return null;

  const handleItemClick = (name: string, type: string) => {
    console.log(`Clicked ${type}: ${name}`);
    onClose();
    // TODO: Implement item activation
  };

  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div className="fixed inset-0 z-[99999]" onClick={onClose} />
      <div className="sc-menu-button-list-container">
        <div className="sc-menu-list-item-heading">MAP THEMES</div>
        {themes.map((theme) => (
          <div key={theme.id} className="sc-menu-list-item" onClick={() => handleItemClick(theme.name, "themes")}>
            <div className="sc-menu-list-item-label sc-menu-theme-icon">{theme.name}</div>
          </div>
        ))}

        <div className="sc-menu-list-item-heading">MAP TOOLS</div>
        <div className="sc-menu-list-item" onClick={() => handleItemClick("Take a Screenshot", "tools")}>
          <div className="sc-menu-list-item-label sc-menu-screenshot-icon">Take a Screenshot</div>
        </div>
        {tools.map((tool) => (
          <div key={tool.id} className="sc-menu-list-item" onClick={() => handleItemClick(tool.name, "tools")}>
            <div className="sc-menu-list-item-label sc-menu-tools-icon">{tool.name}</div>
          </div>
        ))}

        <div className="sc-menu-list-item-heading">OTHER</div>
        <div className="sc-menu-list-item" onClick={() => handleItemClick("What&apos;s New", "other")}>
          <div className="sc-menu-list-item-label sc-menu-terms-icon">What&apos;s New</div>
        </div>
        <div className="sc-menu-list-item" onClick={() => handleItemClick("Map Legend", "other")}>
          <div className="sc-menu-list-item-label sc-menu-legend-icon">Map Legend</div>
        </div>
        <div className="sc-menu-list-item" onClick={() => handleItemClick("Help", "other")}>
          <div className="sc-menu-list-item-label sc-menu-help-icon">Help</div>
        </div>
        <div className="sc-menu-list-item" onClick={() => handleItemClick("Terms and Conditions", "other")}>
          <div className="sc-menu-list-item-label sc-menu-terms-icon">Terms and Conditions</div>
        </div>
      </div>
    </>
  );
}

export default function SidebarSlim() {
  const { isOpen, activeTab, openSidebar, setActiveTab, themes, tools } = useSidebarStore();
  const { emitActivateTab } = useEventStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Only show when sidebar is closed
  if (isOpen) return null;

  const handleTabClick = (tabName: string, tabIndex: number) => {
    openSidebar();
    setActiveTab(tabIndex);
    emitActivateTab(tabName);
  };

  const handleMoreClick = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  return (
    <div className="sc-sidebar-slim-container">
      <SlimButton title="Layers" icon="legend-32x32.png" onClick={() => handleTabClick("layers", 0)} isSelected={activeTab === 0} isActive={false} hidden={false} />
      <SlimButton
        title="Tools"
        icon="tools-32x32.png"
        onClick={() => handleTabClick("tools", 1)}
        isSelected={activeTab === 1}
        isActive={false} // TODO: Detect if any tool is active
        hidden={false}
      />
      <SlimButton
        title="My Maps"
        icon="map-32x32.png"
        onClick={() => handleTabClick("mymaps", 2)}
        isSelected={activeTab === 2}
        isActive={false} // TODO: Detect if editing
        hidden={false}
      />
      <SlimButton
        title="Themes"
        icon="theme-32x32.png"
        onClick={() => handleTabClick("themes", 3)}
        isSelected={activeTab === 3}
        isActive={false} // TODO: Detect if any theme is active
        hidden={false}
      />
      <SlimButton title="Reports" icon="report-32x32.png" onClick={() => handleTabClick("reports", 4)} isSelected={activeTab === 4} isActive={false} hidden={false} />

      <div className="sc-sidebar-slim-footer-container">
        <div className={`sc-sidebar-slim-button-container ${showMoreMenu ? "active" : ""}`} onClick={handleMoreClick}>
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
        <MoreMenu isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} themes={themes} tools={tools} />
      </div>
    </div>
  );
}

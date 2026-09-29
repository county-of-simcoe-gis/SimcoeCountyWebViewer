"use client";

import Image from "next/image";
import { RxDropdownMenu } from "react-icons/rx";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMyMapsStore } from "@/stores/myMapsStore";

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
    <div className={`py-2.5 px-1.5 cursor-pointer rounded-sm mx-0.5 relative ${isSelected ? "bg-[image:var(--sc-gradient-active)] border border-[#90b5d5]" : "hover:bg-black/5 dark:hover:bg-white/5"}`} onClick={onClick}>
      {isActive && <span className="h-2.5 w-2.5 bg-[rgb(120,204,50)] rounded-full inline-block absolute right-1.5" />}
      <button className="bg-transparent border-none p-0 cursor-pointer text-[9pt] flex flex-col items-center gap-1 w-full text-base-content">
        <Image src={`/images/${icon}`} alt={title} width={32} height={32} />
        <span className="text-[9pt] leading-none text-center whitespace-nowrap">{title}</span>
      </button>
    </div>
  );
}

export default function SidebarSlim() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const activeTab = useSidebarStore((s) => s.activeTab);
  const openSidebar = useSidebarStore((s) => s.openSidebar);
  const setActiveTab = useSidebarStore((s) => s.setActiveTab);
  const isMoreMenuOpen = useSidebarStore((s) => s.isMoreMenuOpen);
  const toggleMoreMenu = useSidebarStore((s) => s.toggleMoreMenuFromSidebar);
  const hideLayers = useSidebarStore((s) => s.hideLayers);
  const hideTools = useSidebarStore((s) => s.hideTools);
  const hideMyMaps = useSidebarStore((s) => s.hideMyMaps);
  const hideThemes = useSidebarStore((s) => s.hideThemes);
  const hideReports = useSidebarStore((s) => s.hideReports);
  const activeTool = useSidebarStore((s) => s.activeTool);
  const activeTheme = useSidebarStore((s) => s.activeTheme);
  const isMyMapsEditing = useMyMapsStore((s) => s.isEditing);

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
  };

  const handleMoreClick = () => {
    toggleMoreMenu();
  };

  return (
    <div className="w-[65px] h-[calc(100vh-52px)] absolute top-[52px] left-0 text-center select-none pb-1.5 pl-0.5 pr-px bg-[image:var(--sc-gradient-default)] border-r border-base-300 z-[1000] overflow-visible max-[770px]:hidden">
      {!hideLayers && (
        <SlimButton
          title="Layers"
          icon="legend-32x32.png"
          onClick={() => handleTabClick("layers", getTabIndex("layers"))}
          isSelected={activeTab === getTabIndex("layers")}
          isActive={false}
          hidden={false}
        />
      )}
      {!hideTools && (
        <SlimButton
          title="Tools"
          icon="tools-32x32.png"
          onClick={() => handleTabClick("tools", getTabIndex("tools"))}
          isSelected={activeTab === getTabIndex("tools")}
          isActive={activeTool !== null}
          hidden={false}
        />
      )}
      {!hideMyMaps && (
        <SlimButton
          title="My Maps"
          icon="map-32x32.png"
          onClick={() => handleTabClick("mymaps", getTabIndex("mymaps"))}
          isSelected={activeTab === getTabIndex("mymaps")}
          isActive={isMyMapsEditing}
          hidden={false}
        />
      )}
      {!hideThemes && (
        <SlimButton
          title="Themes"
          icon="theme-32x32.png"
          onClick={() => handleTabClick("themes", getTabIndex("themes"))}
          isSelected={activeTab === getTabIndex("themes")}
          isActive={activeTheme !== null}
          hidden={false}
        />
      )}
      {!hideReports && (
        <SlimButton
          title="Reports"
          icon="report-32x32.png"
          onClick={() => handleTabClick("reports", getTabIndex("reports"))}
          isSelected={activeTab === getTabIndex("reports")}
          isActive={false}
          hidden={false}
        />
      )}

      <div className="absolute bottom-0 pb-2.5 pl-0.5 pr-px w-[calc(100%-4px)]">
        <div
          className={`py-2.5 px-1.5 cursor-pointer rounded-sm mx-0.5 relative ${isMoreMenuOpen ? "bg-[image:var(--sc-gradient-active)] border border-[#90b5d5]" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
          onClick={handleMoreClick}
        >
          <button className="flex flex-col items-center gap-1 bg-transparent border-none py-2.5 px-2 text-[9pt] cursor-pointer w-full text-base-content pointer-events-none" title="More Options">
            <RxDropdownMenu size={24} className="pointer-events-none rotate-180" />
            <span className="text-[9pt] leading-none text-center whitespace-nowrap pointer-events-none">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}

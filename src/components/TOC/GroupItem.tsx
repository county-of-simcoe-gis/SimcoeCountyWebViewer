"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { TOCLayerGroup, TOCLayer, useTOCStore } from "@/stores/tocStore";
import { FaEllipsisV, FaFolder, FaFolderOpen } from "react-icons/fa";
import LayerItem from "@/components/TOC/LayerItem";
import { MenuList, MenuItem, MenuHeading } from "@/components/ui/MenuList";

interface GroupItemProps {
  id: string;
  group: TOCLayerGroup;
  searchText: string;
  sortAlpha: boolean;
  visible: boolean;
  panelOpen: boolean;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
  onGroupFolderToggle: (groupValue: string, isOpen: boolean) => void;
  onLayerVisibilityGroup: (group: TOCLayerGroup, visible: boolean) => void;
}

export default function GroupItem({
  id,
  group,
  searchText,
  sortAlpha,
  visible,
  panelOpen: propsPanelOpen,
  onLayerChange,
  onLegendToggle,
  onLayerOptionsClick,
  onGroupFolderToggle,
  onLayerVisibilityGroup,
}: GroupItemProps) {
  const getFolderOpenState = useTOCStore((s) => s.getFolderOpenState);
  const setFolderOpenState = useTOCStore((s) => s.setFolderOpenState);
  const allLayers = useTOCStore((s) => s.allLayers);

  // Get persistent folder state from store, fallback to propsPanelOpen
  const [panelOpen, setPanelOpen] = useState(() => getFolderOpenState(group.value) ?? propsPanelOpen);
  const [userPanelOpen, setUserPanelOpen] = useState(() => getFolderOpenState(group.value) ?? propsPanelOpen);
  const [activeLayerCount, setActiveLayerCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate active layer count using fresh store data
  const calculateActiveLayerCount = useCallback(() => {
    // Get the latest layer visibility from the store's allLayers array
    const groupLayerNames = group.layers.map((l) => l.name);
    const visibleCount = allLayers.filter((layer) => groupLayerNames.includes(layer.name) && layer.visible).length;
    return visibleCount;
  }, [group.layers, allLayers]);

  // Update active layer count when store data changes
  useEffect(() => {
    const newActiveCount = calculateActiveLayerCount();
    if (newActiveCount !== activeLayerCount) {
      setActiveLayerCount(newActiveCount);
    }
  }, [calculateActiveLayerCount, activeLayerCount, allLayers, group.label]);

  // Handle panel open state changes from props and sync with store
  useEffect(() => {
    const storedState = getFolderOpenState(group.value);
    const finalState = storedState ?? propsPanelOpen;
    setPanelOpen(finalState);
    setUserPanelOpen(finalState);

    // Update store if not already set
    if (storedState === undefined) {
      setFolderOpenState(group.value, propsPanelOpen);
    }
  }, [propsPanelOpen, group.value, getFolderOpenState, setFolderOpenState]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Group options menu
  const onGroupOptionsClick = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ top: rect.bottom, left: rect.left });
    setMenuOpen((prev) => !prev);
  }, []);

  const onMenuItemClick = useCallback(
    (action: string) => {
      setMenuOpen(false);
      if (action === "enable-layers") {
        onLayerVisibilityGroup(group, true);
      } else if (action === "disable-layers") {
        onLayerVisibilityGroup(group, false);
      }
    },
    [group, onLayerVisibilityGroup],
  );

  // Filter layers based on search text
  const filteredLayers = useCallback(() => {
    return group.layers.filter((layer) => {
      if (searchText === "") return true;
      return [layer.tocDisplayName.toUpperCase(), layer.groupName.toUpperCase()].join(" ").indexOf(searchText.toUpperCase()) !== -1;
    });
  }, [group.layers, searchText]);

  // Check if group should be visible based on filtered layers
  const isGroupVisible = useCallback(() => {
    return filteredLayers().length > 0;
  }, [filteredLayers]);

  // Handle header click to toggle panel
  const onHeaderClick = useCallback(() => {
    const newPanelOpen = !panelOpen;
    const newUserPanelOpen = !userPanelOpen;

    setPanelOpen(newPanelOpen);
    setUserPanelOpen(newUserPanelOpen);

    // Save folder state to store for persistence
    setFolderOpenState(group.value, newPanelOpen);

    if (searchText === "") {
      onGroupFolderToggle(group.value, newPanelOpen);
    }
  }, [panelOpen, userPanelOpen, searchText, group.value, onGroupFolderToggle, setFolderOpenState]);

  // Sort layers if needed
  const getSortedLayers = useCallback(() => {
    const layers = filteredLayers();
    if (sortAlpha) {
      return [...layers].sort((a, b) => a.tocDisplayName.localeCompare(b.tocDisplayName));
    }
    return layers;
  }, [filteredLayers, sortAlpha]);

  // Don't render if group is not visible or has no visible layers
  if (!group || !visible || !isGroupVisible()) {
    return null;
  }

  return (
    <div className="border-0 border-[#ddd] rounded-[3px] mb-[5px]" key={`${id}-sc-toc-group-list-container`}>
      <div
        className={`font-bold text-sm flex items-center bg-white w-[97%] border-0 border-[#ddd] cursor-pointer select-none p-0.5 pl-2.5 ${activeLayerCount > 0 ? "text-[#000080] font-extrabold" : "text-[#373737]"}`}
        onClick={onHeaderClick}
      >
        <div className="flex items-center shrink-0">
          {panelOpen ? (
            <FaFolderOpen size={16} className={`opacity-90 mr-2 ${group.useRedFolder ? "text-[#cc0000]" : "text-[#e3b778]"}`} />
          ) : (
            <FaFolder size={16} className={`opacity-90 mr-2 ${group.useRedFolder ? "text-[#cc0000]" : "text-[#e3b778]"}`} />
          )}
        </div>
        <div className="w-[310px] ml-[5px]">{`${group.label} - (${activeLayerCount}/${group.layers.length})`}</div>
      </div>

      <div className="absolute right-2 -mt-[18px] cursor-pointer" title="Group Options" onClick={onGroupOptionsClick}>
        <FaEllipsisV size={16} className="opacity-70 text-[#666]" />
      </div>

      {menuOpen && (
        <div ref={menuRef} className="fixed z-[100000]" style={{ top: menuPosition.top, left: menuPosition.left }}>
          <MenuList>
            <MenuHeading>{`Options - ${group.label}`}</MenuHeading>
            <MenuItem onClick={() => onMenuItemClick("enable-layers")}>Turn On All Layers</MenuItem>
            <MenuItem onClick={() => onMenuItemClick("disable-layers")}>Turn Off All Layers</MenuItem>
          </MenuList>
        </div>
      )}

      <div className={panelOpen || (isGroupVisible() && searchText !== "") ? "relative pl-5 border-l-2 border-dotted border-[#ccc] ml-2.5" : "hidden"} key={`${id}-sc-toc-group-list-item-container`}>
        {getSortedLayers().map((layer, index) => (
          <LayerItem
            key={`${layer.name}-${index}`}
            layerInfo={layer}
            group={group}
            searchText={searchText}
            showDragHandle={false}
            onLayerChange={onLayerChange}
            onLegendToggle={onLegendToggle}
            onLayerOptionsClick={onLayerOptionsClick}
          />
        ))}
      </div>
    </div>
  );
}

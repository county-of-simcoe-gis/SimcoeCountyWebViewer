"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { TOCLayerGroup, TOCLayer, useTOCStore } from "@/stores/tocStore";
import { FaFolder, FaFolderOpen } from "react-icons/fa";
import LayerItem from "@/components/TOC/LayerItem";
import { trackGroup } from "@/lib/appStats";

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
  const groupCheckboxRef = useRef<HTMLInputElement>(null);

  // Calculate active layer count using fresh store data
  const calculateActiveLayerCount = useCallback(() => {
    // Match by unique ID to avoid counting same-named layers from other groups
    const groupLayerIds = new Set(group.layers.map((l) => l.id));
    const visibleCount = allLayers.filter((layer) => groupLayerIds.has(layer.id) && layer.visible).length;
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

  // Group visibility checkbox
  // Compute group visibility checkbox state from all layers in the group
  const groupLayerIds = useMemo(() => new Set(group.layers.map((l) => l.id)), [group.layers]);
  const groupLayers = allLayers.filter((layer) => groupLayerIds.has(layer.id));
  const visibleGroupLayers = groupLayers.filter((layer) => layer.visible);
  const allVisible = groupLayers.length > 0 && visibleGroupLayers.length === groupLayers.length;
  const someVisible = visibleGroupLayers.length > 0 && visibleGroupLayers.length < groupLayers.length;

  // Keep the checkbox indeterminate state in sync with partial visibility
  useEffect(() => {
    if (groupCheckboxRef.current) {
      groupCheckboxRef.current.indeterminate = someVisible;
    }
  }, [someVisible]);

  const onGroupVisibilityChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      evt.stopPropagation();
      // Track user-initiated group turn-on only
      if (!allVisible) {
        trackGroup(group.label);
      }
      onLayerVisibilityGroup(group, !allVisible);
    },
    [group, allVisible, onLayerVisibilityGroup],
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
    <div className="border-0 border-base-300 rounded-[3px] mb-[5px]" key={`${id}-sc-toc-group-list-container`}>
      <div
        className={`font-bold text-sm flex items-center bg-base-100 w-[97%] border-0 border-base-300 cursor-pointer select-none p-0.5 pl-2.5 ${activeLayerCount > 0 ? "text-primary font-extrabold" : "text-base-content"}`}
        onClick={onHeaderClick}
      >
        <div className="flex items-center shrink-0">
          {panelOpen ? (
            <FaFolderOpen size={16} className={`opacity-90 mr-2 ${group.useRedFolder ? "text-[#cc0000]" : "text-[#e3b778]"}`} />
          ) : (
            <FaFolder size={16} className={`opacity-90 mr-2 ${group.useRedFolder ? "text-[#cc0000]" : "text-[#e3b778]"}`} />
          )}
        </div>
        <input
          ref={groupCheckboxRef}
          id={`sc-toc-group-checkbox-${group.value}`}
          type="checkbox"
          className="inline-flex scale-110 mr-2"
          checked={allVisible}
          onChange={onGroupVisibilityChange}
          onClick={(evt) => evt.stopPropagation()}
          title="Turn all layers in this group on/off"
        />
        <div className="w-[310px] ml-[5px]">{`${group.label} - (${activeLayerCount}/${group.layers.length})`}</div>
      </div>

      <div className={panelOpen || (isGroupVisible() && searchText !== "") ? "relative pl-5 border-l-2 border-dotted border-base-300 ml-2.5" : "hidden"} key={`${id}-sc-toc-group-list-item-container`}>
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

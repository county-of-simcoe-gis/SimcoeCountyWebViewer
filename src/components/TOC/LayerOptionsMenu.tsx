"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Layer } from "ol/layer";
import { TOCLayer, TOCLayerGroup, useTOCStore } from "@/stores/tocStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useMapStore } from "@/stores/mapStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { FaInfoCircle, FaSearchPlus, FaDownload, FaTrash, FaTable, FaTimes, FaEye } from "react-icons/fa";
import { openLayerInfo } from "@/lib/layerInfoHelpers";
import { useToast } from "@/hooks/useToast";
import { useAttributeTableStore } from "@/stores/attributeTableStore";
import { reprojectExtentToWebMercator } from "@/utils/coordinateConversion";
import { fetchWmsLayerExtent } from "@/utils/geoServerClient";
import "@/components/TOC/LayerOptionsMenu.css";

interface LayerOptionsMenuProps {
  layerInfo: TOCLayer;
  group: TOCLayerGroup;
  position: { x: number; y: number };
  onClose: () => void;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
}

export default function LayerOptionsMenu({ layerInfo, group, position, onClose }: LayerOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const attributeTableEnabled = useMapStore((s) => s.controlVisibility.attributeTable);

  // Always get the most current layer info from TOC store to avoid stale data
  const getCurrentLayerInfo = useCallback(() => {
    const tocState = useTOCStore.getState();
    const currentLayer = tocState.getLayerById(layerInfo.id);
    return currentLayer || layerInfo; // Fallback to original layerInfo if not found
  }, [layerInfo]);

  // Get opacity from layerManagerStore as the single source of truth
  const getCurrentOpacity = useCallback(() => {
    const currentLayerInfo = getCurrentLayerInfo();

    if (currentLayerInfo.managedLayerId) {
      const layerManagerState = useLayerManagerStore.getState();
      const managedLayer = layerManagerState.getLayer(currentLayerInfo.managedLayerId);
      if (managedLayer) {
        return managedLayer.opacity;
      }
    }
    // Fallback to current layerInfo opacity
    return currentLayerInfo.opacity ?? 1.0;
  }, [getCurrentLayerInfo]);

  const [opacity, setOpacity] = useState(() => getCurrentOpacity());
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);

  const updateLayerOpacity = useLayerManagerStore((s) => s.updateLayerOpacity);
  const map = useMapStore((s) => s.map);

  // Sync opacity from store when not actively dragging
  useEffect(() => {
    if (!isDragging) {
      const currentOpacity = getCurrentOpacity();
      if (Math.abs(currentOpacity - opacity) > 0.01) {
        setOpacity(currentOpacity);
      }
    }
  }, [getCurrentOpacity, opacity, isDragging]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (newX + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }
      if (newX < 10) {
        newX = 10;
      }

      // Adjust vertical position
      if (newY + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }
      if (newY < 10) {
        newY = 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(event.target.value);
    setOpacity(newOpacity);

    // Get the most current layer info to ensure we have the right managedLayerId
    const currentLayerInfo = getCurrentLayerInfo();

    // All TOC layers should be managed layers
    if (currentLayerInfo.managedLayerId) {
      updateLayerOpacity(currentLayerInfo.managedLayerId, newOpacity);
    } else {
      // Fallback: try to update the TOC store directly for unmanaged layers
      const tocState = useTOCStore.getState();
      tocState.updateLayerOpacityById(currentLayerInfo.id, newOpacity);
    }
  };

  const handleOpacityStart = () => {
    setIsDragging(true);
  };

  const handleOpacityComplete = () => {
    setIsDragging(false);
    // No need to call onLayerChange - opacity updates are handled directly above
  };

  const handleMetadata = () => {
    const currentLayerInfo = getCurrentLayerInfo();
    const success = openLayerInfo(currentLayerInfo, {
      showDownload: false,
    });

    if (!success) {
      toast.info("Layer information is not available for this layer.");
    }

    onClose();
  };

  const handleZoomToLayer = async () => {
    if (!map) {
      console.warn("Map not available");
      return;
    }

    try {
      const currentLayerInfo = getCurrentLayerInfo();

      // If the layer has a managedLayerId, use the layer manager to get the extent
      if (currentLayerInfo.managedLayerId) {
        const { getLayerExtent } = useLayerManagerStore.getState();
        const extent = getLayerExtent(currentLayerInfo.managedLayerId);

        if (extent) {
          // Check if this is a special marker indicating we need to fetch capabilities
          if (typeof extent === "object" && extent !== null && "needsCapabilities" in extent) {
            const capabilitiesInfo = extent as { needsCapabilities: boolean; wmsUrl: string; layerName: string };

            // Scope the request to this single workspace+layer (GeoServer virtual service)
            // instead of hitting the global /geoserver/wms endpoint, which returns
            // capabilities for every layer on the server and can be very slow. Also attaches
            // a Bearer token for secured GeoServer endpoints (opengis2.simcoe.ca).
            const wmsExtent = await fetchWmsLayerExtent(capabilitiesInfo.wmsUrl, capabilitiesInfo.layerName);
            if (wmsExtent) {
              const view = map.getView();
              view.fit(wmsExtent, {
                duration: 1000,
                padding: [20, 20, 20, 20],
                maxZoom: 16,
              });

              onClose();
              return;
            }

            // If we get here, the capabilities approach failed, continue to other methods
          } else if (typeof extent === "object" && extent !== null && "needsArcGISExtent" in extent) {
            // ArcGIS layer with no extent captured at build time - fetch it from the ArcGIS
            // REST layer metadata endpoint (?f=json), which exposes extent/fullExtent +
            // spatialReference in the service's native CRS.
            const arcgisInfo = extent as { needsArcGISExtent: boolean; metadataUrl: string };

            try {
              const response = await fetch(arcgisInfo.metadataUrl);
              const layerJson = await response.json();
              const svcExtent = layerJson?.extent ?? layerJson?.fullExtent;

              if (svcExtent && [svcExtent.xmin, svcExtent.ymin, svcExtent.xmax, svcExtent.ymax].every((value: unknown) => typeof value === "number" && isFinite(value))) {
                const wkid = svcExtent.spatialReference?.latestWkid ?? svcExtent.spatialReference?.wkid;
                const reprojected = reprojectExtentToWebMercator([svcExtent.xmin, svcExtent.ymin, svcExtent.xmax, svcExtent.ymax], wkid);

                if (reprojected) {
                  const view = map.getView();
                  view.fit(reprojected, {
                    duration: 1000,
                    padding: [20, 20, 20, 20],
                    maxZoom: 16,
                  });

                  onClose();
                  return;
                }
              }
            } catch (error) {
              console.warn("Failed to fetch ArcGIS layer extent:", error);
            }

            // If we get here, the ArcGIS metadata fetch failed, continue to other methods
          } else if (Array.isArray(extent)) {
            // Handle normal extent array
            // Check if extent appears to be in geographic coordinates and transform if needed
            const [minX, minY, maxX, maxY] = extent;
            const isGeographic = minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;

            let finalExtent = extent;
            if (isGeographic) {
              try {
                const proj = await import("ol/proj");
                const bottomLeft = proj.fromLonLat([minX, minY]);
                const topRight = proj.fromLonLat([maxX, maxY]);
                finalExtent = [bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]];
              } catch (error) {
                console.warn(`Failed to transform coordinates:`, error);
                finalExtent = extent; // Use original if transformation fails
              }
            }

            const view = map.getView();
            view.fit(finalExtent, {
              duration: 1000,
              padding: [20, 20, 20, 20], // Add some padding around the extent
              maxZoom: 16, // Don't zoom in too far
            });

            // Log the extent after fitting
            setTimeout(() => {
              // Animation complete
            }, 1100); // After animation completes

            onClose();
            return;
          }
        } else {
          console.warn(`❌ No extent returned from layer manager for ${currentLayerInfo.name}`);

          // For WMS layers, try to get extent from WMS GetCapabilities as a fallback
          const tocState = useTOCStore.getState();
          const allGroups = [...tocState.layerListGroups, ...tocState.layerFolderGroups];
          let layerGroup: TOCLayerGroup | null = null;

          for (const group of allGroups) {
            if (group.layers.some((layer) => layer.id === currentLayerInfo.id)) {
              layerGroup = group;
              break;
            }
          }

          if (layerGroup?.wmsGroupUrl) {
            // Scope the request to this single workspace+layer (GeoServer virtual service)
            // instead of hitting the group's/global endpoint for every layer on the server.
            // Also attaches a Bearer token for secured GeoServer endpoints.
            const wmsExtent = await fetchWmsLayerExtent(layerGroup.wmsGroupUrl, currentLayerInfo.name);
            if (wmsExtent) {
              const view = map.getView();
              view.fit(wmsExtent, {
                duration: 1000,
                padding: [20, 20, 20, 20],
                maxZoom: 16,
              });

              onClose();
              return;
            }
          }
        }
      } else {
      }

      // Fallback: Try to get extent directly from the layer object if available
      if (currentLayerInfo.layer) {
        try {
          const olLayer = currentLayerInfo.layer as Layer;
          if ("getSource" in olLayer && typeof olLayer.getSource === "function") {
            const source = olLayer.getSource();
            if (source && "getExtent" in source && typeof source.getExtent === "function") {
              const sourceExtent = source.getExtent();

              if (sourceExtent && Array.isArray(sourceExtent) && sourceExtent.every((coord: number) => isFinite(coord))) {
                // Check if extent is not infinite/default values
                const isValidExtent = sourceExtent[0] !== -Infinity && sourceExtent[1] !== -Infinity && sourceExtent[2] !== Infinity && sourceExtent[3] !== Infinity;
                if (isValidExtent) {
                  const view = map.getView();
                  view.fit(sourceExtent, {
                    duration: 1000,
                    padding: [20, 20, 20, 20],
                    maxZoom: 16,
                  });
                  onClose();
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.warn("Failed to get extent from layer source:", error);
        }
      }

      // Final fallback: Zoom to Simcoe County extent
      const fallbackExtent = [
        -8876000, // west (approx -79.8°)
        5510000, // south (approx 44.1°)
        -8620000, // east (approx -77.5°)
        5680000, // north (approx 45.6°)
      ];

      const view = map.getView();
      view.fit(fallbackExtent, {
        duration: 1000,
        padding: [20, 20, 20, 20],
        maxZoom: 16,
      });
    } catch (error) {
      console.error("Error zooming to layer:", error);
      toast.error("Could not zoom to layer extent.");
    }

    onClose();
  };

  const handleZoomToVisibleScale = () => {
    if (!map) {
      console.warn("Map not available");
      return;
    }

    const scales = [1155581, 577791, 288895, 144448, 72224, 36112, 18056, 9028, 4514, 2257, 1128, 564];
    const currentScale = map.getView().getResolution()! * 96 * 39.37; // Approximate scale calculation

    let minScale = 0;
    let maxScale = 100000000000;

    if (layerInfo.minScale !== undefined) minScale = layerInfo.minScale;
    if (layerInfo.maxScale !== undefined) maxScale = layerInfo.maxScale;

    if (currentScale >= minScale && currentScale <= maxScale) {
      toast.info("Layer is already visible at this scale.");
      onClose();
      return;
    }

    // Find appropriate zoom level
    if (currentScale < minScale) {
      const reversedScales = [...scales].reverse();
      let targetZoom = 20;
      for (let i = 0; i < reversedScales.length; i++) {
        if (reversedScales[i] >= minScale) {
          targetZoom = 20 - i;
          break;
        }
      }
      map.getView().setZoom(targetZoom);
    } else if (currentScale > maxScale) {
      let targetZoom = 9;
      for (let i = 0; i < scales.length; i++) {
        if (scales[i] <= maxScale) {
          targetZoom = 9 + i;
          break;
        }
      }
      map.getView().setZoom(targetZoom);
    }

    onClose();
  };

  const handleDownload = () => {
    if (!layerInfo.canDownload) {
      toast.info("This layer is not available for download.");
      return;
    }

    const currentLayerInfo = getCurrentLayerInfo();
    const success = openLayerInfo(currentLayerInfo, {
      showDownload: true,
    });

    if (!success) {
      toast.info("Download is not available for this layer.");
    }

    onClose();
  };

  const handleRemoveLayer = () => {
    if (!layerInfo.userLayer) {
      toast.info("Only user-added layers can be removed.");
      return;
    }

    if (confirm(`Are you sure you want to remove the layer "${layerInfo.tocDisplayName}"?`)) {
      // Remove from OpenLayers map via LayerManager
      if (layerInfo.managedLayerId) {
        LayerManager.removeLayer(layerInfo.managedLayerId);
      }

      // Remove from TOC store (both LIST and FOLDER views)
      const groupName = group?.label || group?.value || "User Added";
      useTOCStore.getState().removeCustomLayer(layerInfo.name, groupName, layerInfo.id);
    }
    onClose();
  };

  // Attribute-table availability — mirror the identify rule in
  // `components/Identify/Identify.tsx`, which treats a layer as
  // identifiable unless it's *explicitly* flagged `queryable === false`.
  // That means layers with `isQueryable` undefined (the common case) still
  // get the attribute table. Live layers are always allowed.
  const attributeTableIdentifiable = layerInfo.liveLayer === true || layerInfo.isQueryable !== false;
  const attributeTableHasEndpoint = !!layerInfo.wfsUrl;
  const attributeTableAvailable = attributeTableIdentifiable && attributeTableHasEndpoint;
  const attributeTableDisabledReason = !attributeTableIdentifiable ? "Layer is not queryable" : !attributeTableHasEndpoint ? "Layer has no query endpoint configured" : undefined;

  const handleAttributeTable = () => {
    if (!attributeTableAvailable) return;
    useAttributeTableStore.getState().openForLayer(layerInfo);
    onClose();
  };

  const menuItems = [
    {
      id: "metadata",
      label: "Metadata",
      icon: <FaInfoCircle />,
      show: true,
      onClick: handleMetadata,
    },
    {
      id: "zoom-to-layer",
      label: "Zoom to Layer",
      icon: <FaSearchPlus />,
      show: !!(layerInfo.metadataUrl || layerInfo.layer),
      onClick: handleZoomToLayer,
    },
    {
      id: "zoom-to-visible-scale",
      label: "Zoom to Visible Scale",
      icon: <FaEye />,
      show: true,
      onClick: handleZoomToVisibleScale,
    },
    {
      id: "attribute-table",
      label: "Attribute Table",
      icon: <FaTable />,
      show: attributeTableEnabled,
      disabled: !attributeTableAvailable,
      title: attributeTableDisabledReason,
      onClick: handleAttributeTable,
    },
    {
      id: "download",
      label: "Download",
      icon: <FaDownload />,
      show: !!layerInfo.canDownload,
      onClick: handleDownload,
    },
    {
      id: "remove",
      label: "Remove Layer",
      icon: <FaTrash />,
      show: !!layerInfo.userLayer,
      onClick: handleRemoveLayer,
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => item.show);

  return createPortal(
    <div
      ref={menuRef}
      data-testid="layer-options-menu"
      className="bg-white border border-[#ccc] rounded-md shadow-lg min-w-[220px] max-w-[280px] font-inherit text-sm overflow-hidden"
      style={{
        position: "fixed",
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 10000,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8f9fa] border-b border-[#e9ecef]">
        <span className="font-medium text-[#333] flex-1 text-[13px] sc-line-clamp-2" title={getCurrentLayerInfo().tocDisplayName}>
          {getCurrentLayerInfo().tocDisplayName}
        </span>
        <button
          className="bg-transparent border-none cursor-pointer text-[#666] p-0.5 ml-2 rounded-[3px] flex items-center justify-center hover:bg-[#e9ecef] hover:text-[#333]"
          onClick={onClose}
          aria-label="Close menu"
        >
          <FaTimes />
        </button>
      </div>

      <div className="py-1">
        {/* Opacity Slider */}
        <div className="flex flex-col items-stretch px-3 py-3 border-b border-[#e9ecef] mb-1 cursor-default">
          <label className="font-medium text-[#333] mb-2 text-[13px] cursor-default">Adjust Opacity</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666] min-w-[30px] text-right">{Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={handleOpacityChange}
              onMouseDown={handleOpacityStart}
              onTouchStart={handleOpacityStart}
              onMouseUp={handleOpacityComplete}
              onTouchEnd={handleOpacityComplete}
              className="layer-options-opacity-slider flex-1"
            />
          </div>
        </div>

        {/* Menu Items */}
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            className={`flex items-center px-3 py-2 m-0 bg-transparent border-none w-full text-left text-sm transition-colors duration-100 ${
              item.disabled ? "text-[#999] cursor-not-allowed opacity-60" : "text-[#333] cursor-pointer hover:bg-[#f8f9fa]"
            }`}
            onClick={item.disabled ? undefined : item.onClick}
            disabled={item.disabled}
            title={item.title}
            aria-disabled={item.disabled || undefined}
          >
            <span className="mr-2 text-[#666] w-4 flex items-center justify-center">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
          </button>
        ))}

        {visibleMenuItems.length === 0 && <div className="flex items-center px-3 py-2 text-[#999] cursor-default italic">No options available for this layer.</div>}
      </div>
    </div>,
    document.body,
  );
}

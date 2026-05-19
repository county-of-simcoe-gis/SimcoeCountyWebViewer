"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { useTOCStore, TOCLayer } from "@/stores/tocStore";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { fetchWMSCapabilities } from "@/utils/tocHelpers";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import { getUID } from "@/utils/helpersCore";
import { showMessage } from "@/utils/helpersUI";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import { FaUpload, FaSearch, FaPlus } from "react-icons/fa";
import type { Layer } from "ol/layer";
import type { Source } from "ol/source";
import type BaseEvent from "ol/events/Event";
import config from "./config.json";
import "./AddLayerTool.css";

// Type definitions
interface AddLayerToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

interface FormatTranslation {
  key: string;
  source: string;
  method: string;
  type: string;
  extensions?: string;
}

interface FormatOption {
  label: string;
  value: string;
  default?: string;
}

interface ServiceConfig {
  server_type: string;
  label: string;
  value: string;
  discoveryUrl: string;
  discoverySuffix: string;
  serviceType: string;
  serviceUrl: string;
  urlSuffix: string;
  filterServices?: string[];
  INFO_FORMAT?: string;
  XSL_TEMPLATE?: string;
}

interface DiscoveredLayer {
  label: string;
  value: string;
  layerName: string;
  url: string;
  style?: string;
  queryable?: boolean;
  infoFormat?: string;
  xslTemplate?: string;
}

// Typed config
const typedConfig = {
  translations: config.translations as FormatTranslation[],
  dataTypes: config.dataTypes as { label: string; options: FormatOption[] }[],
  projections: config.projections as { label: string; value: string }[],
  services: config.services as ServiceConfig[],
};

// Get format translation by key
const getTranslation = (key: string): FormatTranslation | undefined => {
  return typedConfig.translations.find((t) => t.key === key);
};

// Get file extensions for supported file types
const getSupportedFileExtensions = (): string[] => {
  const extensions: string[] = [];
  typedConfig.translations.forEach((t) => {
    if (t.extensions) {
      extensions.push(...t.extensions.split(","));
    }
  });
  return extensions;
};

// Get format translation by file extension
const getTranslationByExtension = (ext: string): FormatTranslation | undefined => {
  return typedConfig.translations.find((t) => t.extensions?.split(",").includes(ext.toLowerCase()));
};

export default function AddLayerTool({ name = "Add Data", helpLink, hideHeader = false, onClose, onSidebarVisibility }: AddLayerToolProps) {
  const { map } = useMapStore();
  const { layerListGroups, layerFolderGroups, tocType, addCustomLayer } = useTOCStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);

  // Common state
  const [layerDisplayName, setLayerDisplayName] = useState<string>("New Layer");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string>("");

  // URL tab state
  const [urlFormatOptions] = useState<FormatOption[]>(typedConfig.dataTypes.find((d) => d.label === "URL")?.options || []);
  const [selectedUrlFormat, setSelectedUrlFormat] = useState<FormatOption | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [discoveredLayers, setDiscoveredLayers] = useState<DiscoveredLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<DiscoveredLayer | null>(null);

  // File tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileFormat, setSelectedFileFormat] = useState<FormatTranslation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Services tab state
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null);
  const [serviceLayers, setServiceLayers] = useState<DiscoveredLayer[]>([]);
  const [selectedServiceLayer, setSelectedServiceLayer] = useState<DiscoveredLayer | null>(null);

  // Get available groups for dropdown
  const availableGroups = tocType === "LIST" ? layerListGroups : layerFolderGroups;

  // Initialize default values
  useEffect(() => {
    if (urlFormatOptions.length > 0 && !selectedUrlFormat) {
      const defaultFormat = urlFormatOptions[0];
      setSelectedUrlFormat(defaultFormat);
      if (defaultFormat.default) {
        setServerUrl(defaultFormat.default);
      }
    }
    if (availableGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(availableGroups[0].value);
    }
    if (typedConfig.services.length > 0 && !selectedService) {
      setSelectedService(typedConfig.services[0]);
    }
  }, [urlFormatOptions, selectedUrlFormat, availableGroups, selectedGroup, selectedService]);

  // Handle URL format change
  const handleUrlFormatChange = useCallback(
    (formatValue: string) => {
      const format = urlFormatOptions.find((f) => f.value === formatValue);
      if (format) {
        setSelectedUrlFormat(format);
        if (format.default) {
          setServerUrl(format.default);
        }
        // Clear discovered layers when format changes
        setDiscoveredLayers([]);
        setSelectedLayer(null);
        setDiscoveryMessage("");
      }
    },
    [urlFormatOptions],
  );

  // Discover layers from WMS service
  const discoverWMSLayers = useCallback(async () => {
    if (!serverUrl) {
      showMessage("Error", "Please enter a server URL", "error");
      return;
    }

    setIsLoading(true);
    setDiscoveryMessage("");
    setDiscoveredLayers([]);
    setSelectedLayer(null);

    try {
      // Build GetCapabilities URL
      let capabilitiesUrl = serverUrl;
      if (!capabilitiesUrl.toLowerCase().includes("getcapabilities")) {
        const separator = capabilitiesUrl.includes("?") ? "&" : "?";
        capabilitiesUrl = `${capabilitiesUrl}${separator}service=WMS&version=1.3.0&request=GetCapabilities`;
      }

      const capabilities = await fetchWMSCapabilities(capabilitiesUrl);

      // Parse layers from capabilities
      const layers: DiscoveredLayer[] = [];
      const parseLayers = (layerList: unknown[]) => {
        if (!Array.isArray(layerList)) return;
        layerList.forEach((layer: unknown) => {
          const typedLayer = layer as { Name?: string; Title?: string; Layer?: unknown[]; Style?: { LegendURL?: { OnlineResource?: string }[] }[]; queryable?: boolean };

          // Recursively parse nested layers first
          if (typedLayer.Layer && Array.isArray(typedLayer.Layer) && typedLayer.Layer.length > 0) {
            parseLayers(typedLayer.Layer as unknown[]);
          } else if (typedLayer.Name && typedLayer.Title) {
            // Only add layers that don't have child layers (i.e., not layer groups)
            // Get style/legend URL if available
            let styleUrl = "";
            if (typedLayer.Style && typedLayer.Style[0]?.LegendURL?.[0]?.OnlineResource) {
              styleUrl = typedLayer.Style[0].LegendURL[0].OnlineResource;
            }

            layers.push({
              label: typedLayer.Title,
              value: typedLayer.Name,
              layerName: typedLayer.Name,
              url: serverUrl,
              style: styleUrl,
              queryable: typedLayer.queryable || false,
            });
          }
        });
      };

      // Navigate to layer list in capabilities response
      const capLayer = (capabilities as { Capability?: { Layer?: { Layer?: unknown[] } } })?.Capability?.Layer;
      if (capLayer?.Layer) {
        parseLayers(capLayer.Layer);
      }

      if (layers.length > 0) {
        setDiscoveredLayers(layers);
        setSelectedLayer(layers[0]);
        setLayerDisplayName(layers[0].label);
        setDiscoveryMessage(`Found ${layers.length} layers`);
      } else {
        setDiscoveryMessage("No layers found");
      }
    } catch (error) {
      console.error("Error discovering layers:", error);
      setDiscoveryMessage("Error discovering layers. Please check the URL.");
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl]);

  // Discover layers from WMTS service
  const discoverWMTSLayers = useCallback(async () => {
    if (!serverUrl) {
      showMessage("Error", "Please enter a server URL", "error");
      return;
    }

    setIsLoading(true);
    setDiscoveryMessage("");
    setDiscoveredLayers([]);
    setSelectedLayer(null);

    try {
      // Build GetCapabilities URL for WMTS
      let capabilitiesUrl = serverUrl;
      if (!capabilitiesUrl.toLowerCase().includes("getcapabilities")) {
        const separator = capabilitiesUrl.includes("?") ? "&" : "?";
        capabilitiesUrl = `${capabilitiesUrl}${separator}service=WMTS&version=1.0.0&request=GetCapabilities`;
      }

      const response = await fetch(capabilitiesUrl);
      const text = await response.text();

      const parser = new WMTSCapabilities();
      const capabilities = parser.read(text);

      const layers: DiscoveredLayer[] = [];

      // Parse WMTS layers from capabilities
      if (capabilities?.Contents?.Layer) {
        capabilities.Contents.Layer.forEach((layer: { Identifier?: string; Title?: string; Style?: Array<{ Identifier?: string }> }) => {
          if (layer.Identifier) {
            layers.push({
              label: layer.Title || layer.Identifier,
              value: layer.Identifier,
              layerName: layer.Identifier,
              url: serverUrl,
              style: layer.Style?.[0]?.Identifier || "",
              queryable: false,
            });
          }
        });
      }

      if (layers.length > 0) {
        setDiscoveredLayers(layers);
        setSelectedLayer(layers[0]);
        setLayerDisplayName(layers[0].label);
        setDiscoveryMessage(`Found ${layers.length} layers`);
      } else {
        setDiscoveryMessage("No layers found");
      }
    } catch (error) {
      console.error("Error discovering WMTS layers:", error);
      setDiscoveryMessage("Error discovering layers. Please check the URL.");
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl]);

  // Discover layers from WFS service
  const discoverWFSLayers = useCallback(async () => {
    if (!serverUrl) {
      showMessage("Error", "Please enter a server URL", "error");
      return;
    }

    setIsLoading(true);
    setDiscoveryMessage("");
    setDiscoveredLayers([]);
    setSelectedLayer(null);

    try {
      // Build GetCapabilities URL for WFS
      let capabilitiesUrl = serverUrl;
      if (!capabilitiesUrl.toLowerCase().includes("getcapabilities")) {
        const separator = capabilitiesUrl.includes("?") ? "&" : "?";
        capabilitiesUrl = `${capabilitiesUrl}${separator}service=WFS&version=2.0.0&request=GetCapabilities`;
      }

      const response = await fetch(capabilitiesUrl);
      const text = await response.text();

      // Parse WFS capabilities XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const layers: DiscoveredLayer[] = [];

      // WFS 2.0 uses FeatureType elements
      const featureTypes = xmlDoc.getElementsByTagNameNS("*", "FeatureType");
      for (let i = 0; i < featureTypes.length; i++) {
        const featureType = featureTypes[i];
        const nameEl = featureType.getElementsByTagNameNS("*", "Name")[0];
        const titleEl = featureType.getElementsByTagNameNS("*", "Title")[0];

        if (nameEl) {
          const name = nameEl.textContent || "";
          const title = titleEl?.textContent || name;

          layers.push({
            label: title,
            value: name,
            layerName: name,
            url: serverUrl,
            queryable: true,
          });
        }
      }

      if (layers.length > 0) {
        setDiscoveredLayers(layers);
        setSelectedLayer(layers[0]);
        setLayerDisplayName(layers[0].label);
        setDiscoveryMessage(`Found ${layers.length} feature types`);
      } else {
        setDiscoveryMessage("No feature types found");
      }
    } catch (error) {
      console.error("Error discovering WFS layers:", error);
      setDiscoveryMessage("Error discovering layers. Please check the URL.");
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl]);

  // Unified discover layers function based on selected format
  const discoverLayers = useCallback(async () => {
    if (!selectedUrlFormat) return;

    switch (selectedUrlFormat.value) {
      case "wms":
        await discoverWMSLayers();
        break;
      case "wmts":
        await discoverWMTSLayers();
        break;
      case "wfs_geojson":
        await discoverWFSLayers();
        break;
      default:
        showMessage("Info", "This format does not require layer discovery", "info");
    }
  }, [selectedUrlFormat, discoverWMSLayers, discoverWMTSLayers, discoverWFSLayers]);

  // Handle layer selection from dropdown
  const handleLayerSelect = useCallback(
    (layerValue: string) => {
      const layer = discoveredLayers.find((l) => l.value === layerValue);
      if (layer) {
        setSelectedLayer(layer);
        setLayerDisplayName(layer.label);
      }
    },
    [discoveredLayers],
  );

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension) {
      showMessage("Error", "Could not determine file type", "error");
      return;
    }

    const format = getTranslationByExtension(extension);
    if (!format) {
      showMessage("Error", `Unsupported file type: ${extension}`, "error");
      return;
    }

    setSelectedFile(file);
    setSelectedFileFormat(format);
    setLayerDisplayName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension for display name
  }, []);

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension) {
      showMessage("Error", "Could not determine file type", "error");
      return;
    }

    const format = getTranslationByExtension(extension);
    if (!format) {
      showMessage("Error", `Unsupported file type: ${extension}`, "error");
      return;
    }

    setSelectedFile(file);
    setSelectedFileFormat(format);
    setLayerDisplayName(file.name.replace(/\.[^/.]+$/, ""));
  }, []);

  // Handle file drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Add layer to map
  const addLayerToMap = useCallback(() => {
    if (!map) {
      showMessage("Error", "Map not available", "error");
      return;
    }

    let sourceType: string;
    let source: string;
    let url: string = "";
    let layerName: string = "";
    let file: File | undefined;

    // Determine layer parameters based on active tab
    switch (activeTab) {
      case 0: // Services tab
        if (!selectedServiceLayer) {
          showMessage("Error", "Please select a layer", "error");
          return;
        }
        sourceType = OL_DATA_TYPES.ImageWMS;
        source = "WMS";
        url = selectedServiceLayer.url;
        layerName = selectedServiceLayer.layerName;
        break;

      case 1: // URL tab
        if (!selectedUrlFormat) {
          showMessage("Error", "Please select a format", "error");
          return;
        }

        const translation = getTranslation(selectedUrlFormat.value);
        if (!translation) {
          showMessage("Error", "Unknown format type", "error");
          return;
        }

        sourceType = translation.type;
        source = translation.source;

        // Handle different URL format types
        if (translation.type === "XYZ") {
          // XYZ tiles don't require layer discovery
          url = serverUrl;
          layerName = layerDisplayName;
        } else if (translation.source === "remote") {
          // Remote GeoJSON/KML URLs don't require layer discovery
          url = serverUrl;
          layerName = layerDisplayName;
        } else if (translation.source === "wfs") {
          // WFS requires layer selection
          if (!selectedLayer) {
            showMessage("Error", "Please discover and select a feature type first", "error");
            return;
          }
          url = selectedLayer.url;
          layerName = selectedLayer.layerName;
        } else if (selectedLayer) {
          // WMS/WMTS with discovered layer
          url = selectedLayer.url;
          layerName = selectedLayer.layerName;
        } else {
          showMessage("Error", "Please discover and select a layer first", "error");
          return;
        }
        break;

      case 2: // File tab
        if (!selectedFile || !selectedFileFormat) {
          showMessage("Error", "Please select a file", "error");
          return;
        }
        sourceType = selectedFileFormat.type;
        source = "file";
        file = selectedFile;
        layerName = layerDisplayName;
        break;

      default:
        return;
    }

    setIsLoading(true);

    try {
      // Create layer using LayerHelpers
      LayerHelpers.getLayer(
        {
          sourceType: sourceType as keyof typeof OL_DATA_TYPES,
          source: source,
          projection: "EPSG:3857",
          layerName: layerName,
          url: url,
          tiled: false,
          file: file,
          name: layerDisplayName,
        },
        (olLayer: Layer) => {
          try {
            if (!olLayer) {
              showMessage("Error", "Failed to create layer. Please check the file format and try again.", "error");
              setIsLoading(false);
              return;
            }

            // Set layer properties
            olLayer.setVisible(true);
            olLayer.setOpacity(1);

            // Get INFO_FORMAT and XSL_TEMPLATE for service layers
            const infoFormat = activeTab === 0 ? selectedServiceLayer?.infoFormat : selectedLayer?.infoFormat;
            const xslTemplate = activeTab === 0 ? selectedServiceLayer?.xslTemplate : selectedLayer?.xslTemplate;

            // Determine queryable status - vector layers from files are queryable
            const isQueryable = LayerHelpers.getLayerSourceType(olLayer.getSource()!) === OL_DATA_TYPES.Vector ? true : false;

            olLayer.setProperties({
              name: layerName,
              displayName: layerDisplayName,
              tocDisplayName: layerDisplayName,
              userLayer: true,
              queryable: isQueryable,
              INFO_FORMAT: infoFormat,
              XSL_TEMPLATE: xslTemplate,
            });

            // Add error handlers to the layer source if it's a vector or image source
            const source = olLayer.getSource();
            if (source) {
              // Handle image/tile load errors
              if ("on" in source && typeof source.on === "function") {
                const typedSource = source as Source & {
                  on: (type: string, listener: (event: BaseEvent) => void) => void;
                };
                typedSource.on("tileloaderror", (event: BaseEvent) => {
                  console.error("Tile load error:", event);
                });
                typedSource.on("imageloaderror", (event: BaseEvent) => {
                  console.error("Image load error:", event);
                });
              }
            }

            // Find the selected group
            const group = availableGroups.find((g) => g.value === selectedGroup);
            const groupName = group?.label || "Custom Layers";

            // Create TOCLayer object
            const tocLayer: TOCLayer = {
              id: getUID(),
              name: layerName,
              displayName: layerDisplayName,
              tocDisplayName: layerDisplayName,
              styleUrl: selectedLayer?.style || "",
              height: 30,
              drawIndex: 0,
              index: 0,
              initialDrawIndex: 0,
              showLegend: false,
              legendHeight: -1,
              legendImage: null,
              legendObj: null,
              visible: true,
              layer: olLayer,
              metadataUrl: null,
              opacity: 1,
              minScale: 0,
              maxScale: 0,
              liveLayer: !!selectedLayer?.style,
              isQueryable: isQueryable,
              groupName: groupName,
              group: selectedGroup,
              userLayer: true,
              canDownload: false,
              infoFormat: infoFormat,
              xslTemplate: xslTemplate,
            };

            // Add to TOC
            addCustomLayer(tocLayer, groupName);

            showMessage("Success", `Layer "${layerDisplayName}" added successfully`, "success");

            // Reset form
            setLayerDisplayName("New Layer");
            setSelectedFile(null);
            setSelectedFileFormat(null);
            setDiscoveredLayers([]);
            setSelectedLayer(null);
            setServiceLayers([]);
            setSelectedServiceLayer(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }

            setIsLoading(false);
          } catch (error) {
            console.error("Error configuring layer:", error);
            showMessage("Error", "Failed to configure layer. Please try again.", "error");
            setIsLoading(false);
          }
        },
      );
    } catch (error) {
      console.error("Error adding layer:", error);
      showMessage("Error", "Failed to add layer. Please check your input and try again.", "error");
      setIsLoading(false);
    }
  }, [map, activeTab, selectedServiceLayer, selectedUrlFormat, selectedLayer, serverUrl, selectedFile, selectedFileFormat, layerDisplayName, selectedGroup, availableGroups, addCustomLayer]);

  // Discover service layers
  const discoverServiceLayers = useCallback(async () => {
    if (!selectedService) return;

    setIsLoading(true);
    setServiceLayers([]);
    setSelectedServiceLayer(null);
    setDiscoveryMessage("");

    try {
      const layers: DiscoveredLayer[] = [];
      let servicesToProcess: string[] = [];

      // Check if filterServices is specified - use those directly
      if (selectedService.filterServices && selectedService.filterServices.length > 0) {
        servicesToProcess = selectedService.filterServices;
      } else {
        // For ESRI servers, first discover available services from the REST endpoint
        if (selectedService.server_type === "esri") {
          const discoveryUrl = `${selectedService.discoveryUrl}/${selectedService.value}${selectedService.discoverySuffix}`;

          try {
            const response = await fetch(discoveryUrl);
            const data = await response.json();

            // Parse services from ESRI REST response
            if (data.services && Array.isArray(data.services)) {
              servicesToProcess = data.services.map((svc: { name: string; type: string }) => svc.name);
            }
          } catch (err) {
            console.warn("Failed to discover ESRI services:", err);
            // Fallback to using the value directly
            servicesToProcess = [selectedService.value];
          }
        } else if (selectedService.server_type === "geoserver") {
          // For GeoServer, use the value directly
          servicesToProcess = [selectedService.value];
        } else {
          servicesToProcess = [selectedService.value];
        }
      }

      // Process each discovered service
      for (const serviceName of servicesToProcess) {
        // Build WMS URL - replace ":" with "/" for ESRI services
        const normalizedServiceName = serviceName.replace(":", "/");
        const wmsUrl = `${selectedService.serviceUrl}/${normalizedServiceName}${selectedService.urlSuffix}`;

        try {
          const capabilitiesUrl = `${wmsUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
          const capabilities = await fetchWMSCapabilities(capabilitiesUrl);

          // Parse layers
          const parseLayers = (layerList: unknown[]) => {
            if (!Array.isArray(layerList)) return;
            layerList.forEach((layer: unknown) => {
              const typedLayer = layer as { Name?: string; Title?: string; Layer?: unknown[] };
              if (typedLayer.Name && typedLayer.Title) {
                // Skip if this is a GeoServer group layer with multiple sub-layers
                if (selectedService.server_type === "geoserver" && typedLayer.Layer && Array.isArray(typedLayer.Layer) && typedLayer.Layer.length > 1) {
                  return;
                }
                layers.push({
                  label: typedLayer.Title,
                  value: `${serviceName}:${typedLayer.Name}`,
                  layerName: typedLayer.Name,
                  url: wmsUrl,
                  infoFormat: selectedService.INFO_FORMAT,
                  xslTemplate: selectedService.XSL_TEMPLATE,
                });
              }
              if (typedLayer.Layer) {
                parseLayers(typedLayer.Layer as unknown[]);
              }
            });
          };

          const capLayer = (capabilities as { Capability?: { Layer?: { Layer?: unknown[] } } })?.Capability?.Layer;
          if (capLayer?.Layer) {
            parseLayers(capLayer.Layer);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.warn(`Failed to fetch capabilities for ${serviceName}:`, errorMessage);
          // Continue with other services even if one fails
        }
      }

      if (layers.length > 0) {
        // Sort by label
        layers.sort((a, b) => a.label.localeCompare(b.label));
        setServiceLayers(layers);
        setSelectedServiceLayer(layers[0]);
        setLayerDisplayName(layers[0].label);
        setDiscoveryMessage(`Found ${layers.length} layers`);
      } else {
        setDiscoveryMessage("No layers found. The service may not support WMS or may require authentication.");
      }
    } catch (error) {
      console.error("Error discovering service layers:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setDiscoveryMessage(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedService]);

  // Handle service layer selection
  const handleServiceLayerSelect = useCallback(
    (layerValue: string) => {
      const layer = serviceLayers.find((l) => l.value === layerValue);
      if (layer) {
        setSelectedServiceLayer(layer);
        setLayerDisplayName(layer.label);
      }
    },
    [serviceLayers],
  );

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const supportedExtensions = getSupportedFileExtensions();

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-3 space-y-4 text-sm">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-base-100/70 flex items-center justify-center z-50">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        )}

        {/* TOC Settings Section */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-3">
            <h3 className="font-semibold text-base mb-2">Table of Contents</h3>

            {/* Group Selection */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium">Add to Group:</span>
              </label>
              <select className="select select-bordered w-full select-sm" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                {availableGroups.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Layer Name */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium">Layer Name:</span>
              </label>
              <input type="text" className="input input-bordered w-full input-sm" value={layerDisplayName} onChange={(e) => setLayerDisplayName(e.target.value)} placeholder="Enter layer name" />
            </div>
          </div>
        </div>

        {/* Source Section with Tabs */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-3">
            <h3 className="font-semibold text-base mb-2">Source</h3>

            <Tabs selectedIndex={activeTab} onSelect={setActiveTab} className="addlayer-tabs">
              <TabList className="addlayer-tab-list">
                <Tab className="addlayer-tab">Services</Tab>
                <Tab className="addlayer-tab">URL</Tab>
                <Tab className="addlayer-tab">File</Tab>
              </TabList>

              {/* Services Tab */}
              <TabPanel>
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-medium">Service:</span>
                    </label>
                    <select
                      className="select select-bordered w-full select-sm"
                      value={selectedService?.value || ""}
                      onChange={(e) => {
                        const service = typedConfig.services.find((s) => s.value === e.target.value);
                        setSelectedService(service || null);
                        setServiceLayers([]);
                        setSelectedServiceLayer(null);
                      }}
                    >
                      {typedConfig.services.map((service) => (
                        <option key={service.value} value={service.value}>
                          {service.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button className="btn btn-primary btn-sm w-full" onClick={discoverServiceLayers} disabled={isLoading || !selectedService}>
                    <FaSearch size={14} />
                    {isLoading ? "Discovering..." : "Discover Layers"}
                  </button>

                  {discoveryMessage && activeTab === 0 && <div className={`text-center text-sm ${serviceLayers.length > 0 ? "text-success" : "text-warning"}`}>{discoveryMessage}</div>}

                  {serviceLayers.length > 0 && (
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text font-medium">Available Layers:</span>
                      </label>
                      <select className="select select-bordered w-full select-sm" value={selectedServiceLayer?.value || ""} onChange={(e) => handleServiceLayerSelect(e.target.value)}>
                        {serviceLayers.map((layer) => (
                          <option key={layer.value} value={layer.value}>
                            {layer.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* URL Tab */}
              <TabPanel>
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-medium">URL Type:</span>
                    </label>
                    <select className="select select-bordered w-full select-sm" value={selectedUrlFormat?.value || ""} onChange={(e) => handleUrlFormatChange(e.target.value)}>
                      {urlFormatOptions.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text font-medium">URL:</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full input-sm"
                      value={serverUrl}
                      onChange={(e) => {
                        setServerUrl(e.target.value);
                        setDiscoveredLayers([]);
                        setSelectedLayer(null);
                      }}
                      placeholder="https://example.com/geoserver/ows"
                    />
                  </div>

                  {selectedUrlFormat?.value !== "xyz" && selectedUrlFormat?.value !== "remote_geojson" && selectedUrlFormat?.value !== "remote_kml" && (
                    <button className="btn btn-primary btn-sm w-full" onClick={discoverLayers} disabled={isLoading || !serverUrl}>
                      <FaSearch size={14} />
                      {isLoading ? "Discovering..." : "Check for Layers"}
                    </button>
                  )}

                  {discoveryMessage && activeTab === 1 && <div className={`text-center text-sm ${discoveredLayers.length > 0 ? "text-success" : "text-warning"}`}>{discoveryMessage}</div>}

                  {discoveredLayers.length > 0 && (
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text font-medium">Available Layers:</span>
                      </label>
                      <select className="select select-bordered w-full select-sm" value={selectedLayer?.value || ""} onChange={(e) => handleLayerSelect(e.target.value)}>
                        {discoveredLayers.map((layer) => (
                          <option key={layer.value} value={layer.value}>
                            {layer.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* File Tab */}
              <TabPanel>
                <div className="space-y-3">
                  <div className="text-xs text-base-content/70 mb-2">Supported: {supportedExtensions.join(", ")}</div>

                  <div
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#d1d5db] rounded-lg bg-[#f9fafb] cursor-pointer transition-all min-h-[120px] hover:border-primary hover:bg-blue-50 active:border-blue-600 active:bg-blue-100"
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload size={32} className="text-base-content/70 mb-2" />
                    <span className="text-sm">{selectedFile ? selectedFile.name : "Drag and Drop or Click to Select File"}</span>
                    <input ref={fileInputRef} type="file" className="hidden" accept={supportedExtensions.map((ext) => `.${ext}`).join(",")} onChange={handleFileChange} />
                  </div>

                  {selectedFile && selectedFileFormat && <div className="text-sm text-success">File type: {selectedFileFormat.type}</div>}
                </div>
              </TabPanel>
            </Tabs>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-2">
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={addLayerToMap}
            disabled={
              isLoading ||
              (activeTab === 0 && !selectedServiceLayer) ||
              (activeTab === 1 && !selectedLayer && selectedUrlFormat?.value !== "xyz" && selectedUrlFormat?.value !== "remote_geojson" && selectedUrlFormat?.value !== "remote_kml") ||
              (activeTab === 1 && (selectedUrlFormat?.value === "xyz" || selectedUrlFormat?.value === "remote_geojson" || selectedUrlFormat?.value === "remote_kml") && !serverUrl) ||
              (activeTab === 2 && !selectedFile)
            }
          >
            <FaPlus size={12} />
            Add Layer
          </button>
        </div>
      </div>
    </PanelComponent>
  );
}

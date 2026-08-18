"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaSearch, FaMapMarkerAlt, FaTools, FaPalette, FaLayerGroup, FaMapPin, FaHome, FaMapMarkedAlt, FaClock, FaBuilding, FaRoad } from "react-icons/fa";
import { useConfig } from "@/hooks/useConfig";
import axiosInstance from "@/lib/axiosInstance";
import { appendSharedArrayItem, getSharedItem, removeSharedArrayItem } from "@/utils/storage";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useTOCStore } from "@/stores/tocStore";
import { useSearchStore } from "@/stores/searchStore";
import { useAppStore } from "@/stores/appStore";

interface SearchType {
  label: string;
  value: string;
}

interface SearchResult {
  name: string;
  type: string;
  municipality?: string;
  location_id?: string;
  place_id?: string;
  x?: number;
  y?: number;
  imageName?: string;
  fullName?: string;
  layerGroupName?: string;
  layerGroup?: string;
  layerName?: string;
  index?: number;
  geojson?: string;
  geojson_point?: string;
  alias?: string;
  is_open_data?: boolean;
}

interface SearchProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const Search: React.FC<SearchProps> = ({ onResultSelect, className = "", placeholder, disabled = false }) => {
  const { config } = useConfig();
  const urlParameters = useAppStore((state) => state.urlParameters);

  // Derive placeholder and hideTypes from config, with prop override
  const resolvedPlaceholder = placeholder ?? config?.searchPlaceHolder ?? "Search...";
  const hideTypeDropdown = config?.searchHideTypes ?? false;

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTypes, setSearchTypes] = useState<SearchType[]>([]);
  const [selectedType, setSelectedType] = useState<SearchType>({ label: "All", value: "All" });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [municipality, setMunicipality] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const [selectWidth, setSelectWidth] = useState<number | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const apiUrlRef = useRef<string>("");
  const isUrlSearchRef = useRef<boolean>(false); // Track if search is from URL parameter
  const hasProcessedUrlSearchRef = useRef<boolean>(false); // Track if URL search has been processed
  const defaultSearchLimit = 10;
  const maxSearchLimit = 100;

  // Update select width whenever selected type changes
  useEffect(() => {
    if (measureSpanRef.current) {
      // px-3 (12px left padding) + pr-8 (32px right padding for arrow) + 4px buffer
      setSelectWidth(measureSpanRef.current.offsetWidth + 12 + 32 + 4);
    }
  }, [selectedType]);

  // API URL builders — paths are relative to axiosInstance baseURL (which includes /api)
  const getSearchURL = (searchText: string, type: string, muni?: string, limit: number = defaultSearchLimit) => {
    const url = `/public/search?q=${encodeURIComponent(searchText)}&type=${type}&limit=${limit}`;
    return muni ? `${url}&muni=${muni}` : url;
  };

  const getSearchInfoURL = (locationID: string) => `/public/search/${locationID}`;

  const getSearchTypesURL = () => `/public/search/types`;

  // Load search history
  const loadSearchHistory = useCallback(() => {
    if (!config?.storageKeys?.SearchHistory) return [];

    const history = getSharedItem<SearchResult[]>(config.storageKeys.SearchHistory) ?? [];
    return history.slice(0, 6); // Limit to 6 items
  }, [config]);

  // Initialize search types and configuration
  useEffect(() => {
    if (!config) return;

    apiUrlRef.current = config.apiUrl;

    // Set municipality from config or URL parameter
    let muni: string | undefined = config.municipality as string | undefined;
    if (!muni) {
      muni = urlParameters.MUNI || undefined;
    }
    if (muni) setMunicipality(muni);

    // Load search types
    const loadSearchTypes = async () => {
      try {
        const response = await axiosInstance.get<string[]>(getSearchTypesURL());
        const result = response.data;
        const types: SearchType[] = [
          { label: "All", value: "All" },
          ...result.map((type) => ({ label: type, value: type })),
          { label: "Open Street Map", value: "Open Street Map" },
          { label: "Map Layer", value: "Map Layer" },
          { label: "Tool", value: "Tool" },
          { label: "Theme", value: "Theme" },
        ];
        setSearchTypes(types);
        setSelectedType(types[0]);
      } catch (error) {
        console.error("Failed to load search types:", error);
        // Fallback to basic types
        const basicTypes: SearchType[] = [
          { label: "All", value: "All" },
          { label: "Address", value: "Address" },
          { label: "Parcel", value: "Parcel" },
        ];
        setSearchTypes(basicTypes);
        setSelectedType(basicTypes[0]);
      }
    };

    loadSearchTypes();
  }, [config, urlParameters]);

  // Get local results (tools, themes, layers) — no network required
  const getLocalResults = useCallback(
    (searchText: string, selectedTypeValue: string): SearchResult[] => {
      if (searchText.length < 2) return [];

      const localResults: SearchResult[] = [];
      const upperSearch = searchText.toUpperCase();

      // Search layers from the TOC store
      if (selectedTypeValue === "All" || selectedTypeValue === "Map Layer") {
        const tocState = useTOCStore.getState();
        const groups = tocState.tocType === "LIST" ? tocState.layerListGroups : tocState.layerFolderGroups;
        for (const group of groups) {
          const matchingLayers = group.layers.filter((layer) => layer.tocDisplayName.toUpperCase().includes(upperSearch));
          for (const layer of matchingLayers) {
            localResults.push({
              name: layer.tocDisplayName,
              type: "Map Layer",
              layerGroupName: group.label,
              layerGroup: group.value,
              layerName: layer.name,
            });
          }
        }
      }

      // Search tools
      if (selectedTypeValue === "All" || selectedTypeValue === "Tool") {
        if (config?.sidebarToolComponents) {
          const tools = config.sidebarToolComponents
            .filter((tool) => tool.name.toUpperCase().includes(upperSearch) && (tool.enabled === undefined || tool.enabled))
            .map((tool) => ({
              name: tool.name.replace(/_/g, " "),
              type: "Tool",
            }));
          localResults.push(...tools);
        }
      }

      // Search themes
      if (selectedTypeValue === "All" || selectedTypeValue === "Theme") {
        if (config?.sidebarThemeComponents) {
          const themes = config.sidebarThemeComponents
            .filter((theme) => theme.name?.toUpperCase().includes(upperSearch) && (theme.enabled === undefined || theme.enabled))
            .map((theme) => ({
              name: theme.name!.replace(/_/g, " "),
              type: "Theme",
            }));
          localResults.push(...themes);
        }
      }

      return localResults;
    },
    [config],
  );

  // Merge local results with API results, deduplicating API results
  const mergeResults = useCallback((localResults: SearchResult[], apiResults: SearchResult[]): SearchResult[] => {
    // Deduplicate API results by location_id (skip nulls to avoid collapsing unrelated results)
    const dedupedApi = apiResults.filter((item, index, self) => !item.location_id || index === self.findIndex((t) => t.location_id === item.location_id));
    return [...localResults, ...dedupedApi];
  }, []);

  // Perform search — shows local results instantly, then merges API results
  const performSearch = useCallback(
    async (searchText: string, type: string, fromUrl: boolean = false) => {
      if (searchText.length < 2) {
        setSearchResults([]);
        return;
      }

      // Show local results immediately (tools, themes, layers) — no network wait
      const localResults = getLocalResults(searchText, type);
      if (!fromUrl && localResults.length > 0) {
        setSearchResults(localResults);
      }

      setIsLoading(true);

      try {
        // For URL searches, fetch a few results to check if there's exactly 1 or multiple
        // If exactly 1, auto-zoom. If multiple, show the dropdown.
        const limit = fromUrl ? 10 : maxSearchLimit;
        const url = getSearchURL(searchText, type, municipality, limit);
        const response = await axiosInstance.get<SearchResult[]>(url);
        const results = response.data;

        if (results) {
          // For URL searches with exactly 1 result, auto-select it
          if (fromUrl && results.length === 1 && results[0].location_id) {
            // Store the result so it's available when user focuses the textbox
            setSearchResults(mergeResults(localResults, results));

            // Fetch the full location info and zoom to it
            try {
              const locationUrl = `/public/search/${results[0].location_id}`;
              const locationResponse = await axiosInstance.get<SearchResult>(locationUrl);
              const locationInfo = locationResponse.data;

              if (locationInfo.geojson) {
                const searchZoomHandlers = (window as unknown as Record<string, unknown>).searchZoomHandlers as Record<string, (result: SearchResult) => void>;
                if (searchZoomHandlers?.handleLocationResult) {
                  await searchZoomHandlers.handleLocationResult(locationInfo);
                }
              }
              // Don't show results dropdown for single URL result (but results are stored for later)
              setIsOpen(false);
            } catch (locationError) {
              console.error("Failed to get location info for URL search:", locationError);
            }
          } else if (fromUrl && results.length > 1) {
            // Multiple results from URL search — include local results too
            setSearchResults(mergeResults(localResults, results));
            setIsOpen(true);
          } else {
            // Normal search — merge local results with API results
            setSearchResults(mergeResults(localResults, results));
          }
        }
      } catch (error) {
        console.error("Search failed:", error);
        // On API failure, keep local results visible instead of clearing everything
        setSearchResults(localResults);
      } finally {
        setIsLoading(false);
        isUrlSearchRef.current = false; // Reset URL search flag
      }
    },
    [municipality, getLocalResults, mergeResults],
  );

  // Handle initial search from URL parameters
  useEffect(() => {
    // Only process URL search once
    if (hasProcessedUrlSearchRef.current) return;

    const search = urlParameters.q;
    const searchType = urlParameters.qt;

    if (search && searchTypes.length > 0) {
      hasProcessedUrlSearchRef.current = true;
      isUrlSearchRef.current = true;

      setSearchValue(search);
      if (searchType) {
        const type = searchTypes.find((t) => t.value === searchType) || selectedType;
        setSelectedType(type);
      }
      // Pass fromUrl=true to handle single result differently
      performSearch(search, searchType || "All", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTypes.length, urlParameters.q, urlParameters.qt]); // Minimal dependencies

  // Handle pending search from store (e.g. URL parameter shortcuts)
  const pendingSearch = useSearchStore((s) => s.pendingSearch);
  useEffect(() => {
    if (!pendingSearch || searchTypes.length === 0) return;

    const { value, type } = pendingSearch;
    setSearchValue(value);
    if (type) {
      const matchedType = searchTypes.find((t) => t.value.toUpperCase() === type.toUpperCase());
      if (matchedType) setSelectedType(matchedType);
    }
    performSearch(value, type || "All", true);
    useSearchStore.getState().clearPendingSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch, searchTypes.length]);

  // Debounced search - only for user-initiated searches (not URL parameter searches)
  useEffect(() => {
    // Skip debounced search if this is a URL-initiated search
    if (isUrlSearchRef.current) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchValue.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchValue, selectedType.value, false);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, selectedType, performSearch]);

  // Handle showing history after clear
  useEffect(() => {
    if (justCleared) {
      const history = loadSearchHistory();
      setSearchResults(history);
      setShowHistory(true);
      setIsOpen(history.length > 0);
      setJustCleared(false);
    }
  }, [justCleared, loadSearchHistory]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Check for illegal characters
    if (value.includes("\\")) {
      return;
    }

    setSearchValue(value);
    setIsOpen(value.length >= 2);
    setHighlightedIndex(-1);
    setShowHistory(false); // Clear history state when typing
  };

  // Handle type change
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = searchTypes.find((type) => type.value === e.target.value) || searchTypes[0];
    setSelectedType(newType);

    if (searchValue.length >= 2) {
      performSearch(searchValue, newType.value);
    }
  };

  // Handle result selection
  const handleResultSelect = async (result: SearchResult) => {
    setSearchValue(result.name);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // Save to search history
    if (config?.storageKeys?.SearchHistory) {
      appendSharedArrayItem(config.storageKeys.SearchHistory, result, 25);
    }

    // Handle different result types
    if (result.type === "Tool") {
      // Open tool in sidebar
      useSidebarStore.getState().requestActivateSidebarItem(result.name, "tools");
    } else if (result.type === "Theme") {
      // Open theme in sidebar
      useSidebarStore.getState().requestActivateSidebarItem(result.name, "themes");
    } else if (result.type === "Map Layer") {
      // Show layer in TOC
      const groupName = result.layerGroupName || result.layerGroup || "";
      if (groupName) {
        // Open sidebar on the Layers tab so the user can see the activated layer
        const sidebarState = useSidebarStore.getState();
        sidebarState.openSidebar();
        sidebarState.setActiveTab(0); // 0 = layers tab
        sidebarState.setActiveContentTab(null);

        // Switch to the correct group BEFORE activating the layer, because
        // switchToGroup restores saved visibility states and would overwrite it
        const tocState = useTOCStore.getState();
        if (tocState.tocType === "LIST") {
          const targetGroup = tocState.layerListGroups.find((g) => g.label === groupName || g.value === groupName);
          if (targetGroup && tocState.selectedGroup?.value !== targetGroup.value) {
            tocState.switchToGroup(targetGroup);
          }
        } else if (tocState.tocType === "FOLDER") {
          const targetGroup = tocState.layerFolderGroups.find((g) => g.label === groupName || g.value === groupName);
          if (targetGroup) {
            tocState.setFolderOpenState(targetGroup.value, true);
          }
        }

        // Activate the layer after the group switch so it isn't overwritten
        useTOCStore.getState().updateLayerVisibility(result.layerName || result.name, groupName, true);
      }
    } else if (result.location_id) {
      // Handle location-based result
      try {
        const locationResponse = await axiosInstance.get<SearchResult>(getSearchInfoURL(result.location_id));
        const locationInfo = locationResponse.data;
        if (locationInfo.geojson) {
          // Use the SearchZoom handlers if available
          const searchZoomHandlers = (window as unknown as Record<string, unknown>).searchZoomHandlers as Record<string, (result: SearchResult) => void>;
          if (searchZoomHandlers?.handleLocationResult) {
            await searchZoomHandlers.handleLocationResult(locationInfo);
          } else {
            console.error("Search: handleLocationResult not available");
          }
        }
      } catch (error) {
        console.error("Failed to get location info:", error);
      }
    } else if (result.place_id || result.x !== undefined) {
      // Handle geocoded result
      const searchZoomHandlers = (window as unknown as Record<string, unknown>).searchZoomHandlers as Record<string, (result: SearchResult) => void>;
      if (searchZoomHandlers?.handleGeocodedResult) {
        searchZoomHandlers.handleGeocodedResult(result);
      } else {
        console.error("Search: handleGeocodedResult not available");
      }
    }

    // Call callback if provided
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleResultSelect(searchResults[highlightedIndex]);
        }
        break;
      case "Delete":
        e.preventDefault();
        // Only allow deleting history items when search is empty (showing history)
        if (showHistory && searchValue.length === 0 && highlightedIndex >= 0 && config?.storageKeys?.SearchHistory) {
          const result = searchResults[highlightedIndex];
          removeSharedArrayItem(config.storageKeys.SearchHistory, result);

          // Refresh the displayed history
          const updatedHistory = loadSearchHistory();
          setSearchResults(updatedHistory);

          // Adjust highlighted index if needed
          if (highlightedIndex >= updatedHistory.length) {
            setHighlightedIndex(updatedHistory.length - 1);
          }

          // Close dropdown if no more history items
          if (updatedHistory.length === 0) {
            setIsOpen(false);
            setShowHistory(false);
            setHighlightedIndex(-1);
          }
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchValue("");
    setHighlightedIndex(-1);
    setJustCleared(true);

    // Clear the search layers from the map
    const searchZoomHandlers = (window as unknown as Record<string, unknown>).searchZoomHandlers as Record<string, () => void>;
    if (searchZoomHandlers?.clearSearchLayers) {
      searchZoomHandlers.clearSearchLayers();
    }

    inputRef.current?.focus();
  };

  // Dismiss dropdown
  const handleDismissDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    setShowHistory(false);
  };

  // Remove item from search history
  const handleRemoveFromHistory = (e: React.MouseEvent, result: SearchResult) => {
    e.stopPropagation(); // Prevent selecting the item
    if (!config?.storageKeys?.SearchHistory) return;

    // Remove from storage
    removeSharedArrayItem(config.storageKeys.SearchHistory, result);

    // Refresh the displayed history
    const updatedHistory = loadSearchHistory();
    setSearchResults(updatedHistory);

    // Close dropdown if no more history items
    if (updatedHistory.length === 0) {
      setIsOpen(false);
      setShowHistory(false);
    }
  };

  // Get result display info
  const getResultDisplayInfo = (result: SearchResult) => {
    let type = "Unknown";
    if (result.type === "Map Layer") {
      type = result.layerGroupName || "";
    } else if (result.type === "Tool" || result.type === "Theme") {
      type = "";
    } else {
      type = result.municipality || "";
    }

    return {
      type,
      subtitle: type === "" ? result.type : `${type} (${result.type})`,
    };
  };

  // Get icon for search result
  const getResultIcon = (result: SearchResult) => {
    const iconProps = { size: 20, className: "text-blue-600" };

    // Map Layer
    if (result.type === "Map Layer") {
      return <FaLayerGroup {...iconProps} />;
    }

    // Tool
    if (result.type === "Tool") {
      return <FaTools {...iconProps} className="text-orange-600" />;
    }

    // Theme
    if (result.type === "Theme") {
      return <FaPalette {...iconProps} className="text-purple-600" />;
    }

    // OpenStreetMap
    if (result.place_id) {
      return <FaMapMarkedAlt {...iconProps} className="text-green-600" />;
    }

    // Address
    if (result.type === "Address") {
      return <FaHome {...iconProps} className="text-blue-600" />;
    }

    // Street
    if (result.type === "Street") {
      return <FaRoad {...iconProps} className="text-gray-600" />;
    }

    // Building/Property
    if (result.type === "Building" || result.type === "Property") {
      return <FaBuilding {...iconProps} className="text-indigo-600" />;
    }

    // Parcel
    if (result.type === "Parcel") {
      return <FaMapPin {...iconProps} className="text-red-600" />;
    }

    // Default marker for other location types
    return <FaMapMarkerAlt {...iconProps} className="text-cyan-600" />;
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex w-full shadow-sm rounded-md overflow-hidden border border-base-300">
        {/* Search Types Dropdown */}
        {!hideTypeDropdown && (
          <div className="relative border-r border-base-300">
            {/* Hidden span used to measure selected label width for dynamic select sizing */}
            <span ref={measureSpanRef} className="invisible absolute whitespace-nowrap text-sm font-semibold pointer-events-none" aria-hidden="true">
              {selectedType.label}
            </span>
            <select
              value={selectedType.value}
              onChange={handleTypeChange}
              className="h-[41px] px-3 font-semibold text-sm bg-base-100 hover:bg-base-200 focus:outline-none focus:ring-1 focus:ring-orange-300 border-0 cursor-pointer appearance-none pr-8"
              style={{
                width: selectWidth ? `${selectWidth}px` : undefined,
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                backgroundSize: "16px",
              }}
            >
              {searchTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Input Container */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchValue.length === 0 && !justCleared) {
                const history = loadSearchHistory();
                setSearchResults(history);
                setShowHistory(true);
                setIsOpen(history.length > 0);
              } else if (searchValue.length >= 2) {
                setIsOpen(searchResults.length > 0);
              }
            }}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            className="w-full h-[41px] text-lg pl-4 pr-20 bg-base-100 border-0 focus:outline-none focus:ring-0 disabled:opacity-50"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          {/* Action Buttons Container */}
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-0.5">
            {/* Clear Button */}
            {searchValue && (
              <button onClick={handleClear} className="btn btn-ghost btn-xs btn-circle text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200" aria-label="Clear search">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search Icon */}
            <div className="w-8 h-8 flex items-center justify-center text-gray-500">{isLoading ? <span className="loading loading-spinner loading-xs"></span> : <FaSearch size={14} />}</div>
          </div>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-[99999999] mt-0.5 bg-base-100 shadow-2xl border border-base-300 border-t-0 rounded-b-md overflow-hidden max-[770px]:fixed max-[770px]:left-0 max-[770px]:right-0 max-[770px]:top-[52px] max-[770px]:mt-0 max-[770px]:rounded-none max-[770px]:border-t"
        >
          <div className="h-[400px] max-[770px]:h-[calc(100vh-52px)] flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-base-content/70">
                <span className="loading loading-spinner loading-lg text-blue-600"></span>
                <p className="text-sm font-medium">Searching...</p>
              </div>
            ) : searchResults.length === 0 && searchValue.length >= 2 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-base-content/70">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs text-base-content/70">Try adjusting your search terms</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                {/* Header for search history or results */}
                {showHistory && searchValue.length === 0 ? (
                  <div className="px-3 py-2.5 bg-base-200 border-b border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaClock className="h-4 w-4 text-base-content/70" />
                      <span className="text-sm font-semibold text-base-content">Recent Searches</span>
                    </div>
                    <button onClick={handleDismissDropdown} className="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-base-content hover:bg-base-300" aria-label="Close dropdown">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 bg-base-200 border-b border-base-300 flex items-center justify-between">
                    <span className="text-sm font-semibold text-base-content">{searchResults.length} Results</span>
                    <button onClick={handleDismissDropdown} className="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-base-content hover:bg-base-300" aria-label="Close dropdown">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Scrollable results area */}
                <div ref={listRef} className="flex-1 overflow-y-auto">
                  {searchResults.map((result, index) => {
                    const displayInfo = getResultDisplayInfo(result);
                    const isHistoryItem = showHistory && searchValue.length === 0;
                    return (
                      <div
                        key={`${result.location_id || result.name}-${index}`}
                        className={`
                          group flex items-center gap-3 px-3 py-2.5 border-b border-base-200 cursor-pointer 
                          transition-all duration-150
                          hover:bg-primary/10
                          ${index === highlightedIndex ? "bg-primary/15" : ""}
                          last:border-b-0
                        `}
                        onClick={() => handleResultSelect(result)}
                      >
                        {/* Icon */}
                        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-base-200 group-hover:bg-primary/10 transition-colors duration-150">
                          {getResultIcon(result)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base-content truncate leading-tight text-sm">
                            {isHistoryItem
                              ? result.name
                              : result.name.split(new RegExp(`(${searchValue})`, "gi")).map((part, i) => (
                                  <span key={i} className={part.toLowerCase() === searchValue.toLowerCase() ? "bg-yellow-200 dark:bg-yellow-700/50 px-0.5 rounded" : ""}>
                                    {part}
                                  </span>
                                ))}
                          </div>
                          {displayInfo.subtitle && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-base-content/60 truncate max-w-full">{displayInfo.subtitle}</span>
                            </div>
                          )}
                        </div>

                        {/* Remove button for history items or arrow for search results */}
                        {isHistoryItem ? (
                          <button
                            onClick={(e) => handleRemoveFromHistory(e, result)}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
                            aria-label="Remove from history"
                            title="Remove from history (or press Delete)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : (
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;

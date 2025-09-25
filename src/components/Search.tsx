"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useConfig } from "@/hooks/useConfig";
import { getAxiosClient } from "@/lib/axiosInstance";
import { appendToStorage, getItemsFromStorage } from "@/utils/storage";
import { useEventStore } from "@/stores/eventStore";
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

const Search: React.FC<SearchProps> = ({ onResultSelect, className = "", placeholder = "Search...", disabled = false }) => {
  const { config } = useConfig();
  const { emit } = useEventStore();
  const urlParameters = useAppStore((state) => state.urlParameters);

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

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const apiUrlRef = useRef<string>("");
  const defaultSearchLimit = 10;
  const maxSearchLimit = 100;

  // API URL builders
  const getSearchURL = (searchText: string, type: string, muni?: string, limit: number = defaultSearchLimit) => {
    const url = `${apiUrlRef.current}public/search?q=${encodeURIComponent(searchText)}&type=${type}&limit=${limit}`;
    return muni ? `${url}&muni=${muni}` : url;
  };

  const getSearchInfoURL = (locationID: string) => `${apiUrlRef.current}public/search/${locationID}`;

  const getSearchTypesURL = () => `${apiUrlRef.current}public/search/types`;

  // Load search history
  const loadSearchHistory = useCallback(() => {
    if (!config?.storageKeys?.SearchHistory) return [];

    const history = getItemsFromStorage<SearchResult[]>(config.storageKeys.SearchHistory) || [];
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
        const axiosClient = getAxiosClient(getSearchTypesURL());
        const response = await axiosClient.get<string[]>(getSearchTypesURL());
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

  // Enhanced search results handler
  const searchResultsHandler = useCallback(
    (results: SearchResult[]) => {
      if (searchValue.length < 2) {
        setSearchResults([]);
        return;
      }

      let newResults = [...results];

      // Remove duplicates based on location_id
      newResults = newResults.filter((item, index, self) => index === self.findIndex((t) => t.location_id === item.location_id));

      // Set default image names
      newResults.forEach((item) => {
        if (!item.imageName) {
          item.imageName = "map-marker-light-blue.png";
        }
      });

      const selectedTypeValue = selectedType.value;

      // Search layers if needed
      if (selectedTypeValue === "All" || selectedTypeValue === "Map Layer") {
        // This would need to be implemented with proper layer search
        // For now, we'll skip this part as it requires integration with the TOC
      }

      // Search tools
      if (selectedTypeValue === "All" || selectedTypeValue === "Tool") {
        if (config?.sidebarToolComponents) {
          const tools = config.sidebarToolComponents
            .filter((tool) => tool.name.toUpperCase().includes(searchValue.toUpperCase()) && (tool.enabled === undefined || tool.enabled))
            .map((tool) => ({
              name: tool.name.replace(/_/g, " "),
              type: "Tool",
              imageName: "tools.png",
            }));
          newResults = [...tools, ...newResults];
        }
      }

      // Search themes
      if (selectedTypeValue === "All" || selectedTypeValue === "Theme") {
        if (config?.sidebarThemeComponents) {
          const themes = config.sidebarThemeComponents
            .filter((theme) => theme.name?.toUpperCase().includes(searchValue.toUpperCase()) && (theme.enabled === undefined || theme.enabled))
            .map((theme) => ({
              name: theme.name!.replace(/_/g, " "),
              type: "Theme",
              imageName: "themes.png",
            }));
          newResults = [...themes, ...newResults];
        }
      }

      setSearchResults(newResults);
    },
    [searchValue, selectedType, config]
  );

  // Perform search
  const performSearch = useCallback(
    async (searchText: string, type: string) => {
      if (searchText.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);

      try {
        const limit = maxSearchLimit; // Always use max limit
        const url = getSearchURL(searchText, type, municipality, limit);
        const axiosClient = getAxiosClient(url);
        const response = await axiosClient.get<SearchResult[]>(url);
        const results = response.data;

        if (results) {
          searchResultsHandler(results);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [municipality, searchResultsHandler]
  );

  // Handle initial search from URL parameters
  useEffect(() => {
    const handleInitialSearch = () => {
      const search = urlParameters.q;
      const searchType = urlParameters.qt;

      if (search) {
        setSearchValue(search);
        if (searchType) {
          const type = searchTypes.find((t) => t.value === searchType) || selectedType;
          setSelectedType(type);
        }
        performSearch(search, searchType || "All");
      }
    };

    if (searchTypes.length > 0) {
      handleInitialSearch();
    }
  }, [searchTypes, selectedType, performSearch, urlParameters]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchValue.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchValue, selectedType.value);
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
      console.log("Search: justCleared effect triggered");
      const history = loadSearchHistory();
      console.log("Search: Effect loaded history:", history);
      setSearchResults(history);
      setShowHistory(true);
      setIsOpen(history.length > 0);
      setJustCleared(false);
    }
  }, [justCleared, loadSearchHistory]);

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
      appendToStorage(config.storageKeys.SearchHistory, result, 25);
    }

    // Handle different result types
    if (result.type === "Tool") {
      // Emit event to open tool
      emit("openTool", { name: result.name });
    } else if (result.type === "Theme") {
      // Emit event to open theme
      emit("openTheme", { name: result.name });
    } else if (result.type === "Map Layer") {
      // Emit event to show layer
      emit("showLayer", { layer: result });
    } else if (result.location_id) {
      // Handle location-based result
      try {
        const locationAxiosClient = getAxiosClient(getSearchInfoURL(result.location_id));
        const locationResponse = await locationAxiosClient.get<SearchResult>(getSearchInfoURL(result.location_id));
        const locationInfo = locationResponse.data;
        if (locationInfo.geojson) {
          // Use the SearchZoom handlers if available
          console.log("Search: Attempting to call handleLocationResult", locationInfo);
          const searchZoomHandlers = (window as unknown as Record<string, unknown>).searchZoomHandlers as Record<string, (result: SearchResult) => void>;
          console.log("Search: searchZoomHandlers available:", !!searchZoomHandlers);
          if (searchZoomHandlers?.handleLocationResult) {
            console.log("Search: Calling handleLocationResult");
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
      console.log("Search: Attempting to call handleGeocodedResult", result);
      const searchZoomHandlers = (window as unknown as Record<string, unknown>).searchZoomHandlers as Record<string, (result: SearchResult) => void>;
      console.log("Search: searchZoomHandlers available:", !!searchZoomHandlers);
      if (searchZoomHandlers?.handleGeocodedResult) {
        console.log("Search: Calling handleGeocodedResult");
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

    inputRef.current?.focus();
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

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Types Dropdown */}
      <div
        className="absolute top-[7px] ml-[1px] z-[1000000] max-w-[600px]"
        style={{
          width: `${50 + selectedType.label.length * 9}px`,
        }}
      >
        <select
          value={selectedType.value}
          onChange={handleTypeChange}
          className="h-[38px] w-full border-none shadow-none bg-transparent text-sm pr-8 pl-2 outline-none appearance-none cursor-pointer"
          style={{
            background: "transparent",
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

      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            console.log("Search: Input focused, searchValue length:", searchValue.length, "justCleared:", justCleared);
            if (searchValue.length === 0 && !justCleared) {
              const history = loadSearchHistory();
              console.log("Search: OnFocus loaded history:", history);
              setSearchResults(history);
              setShowHistory(true);
              setIsOpen(history.length > 0);
            } else if (searchValue.length >= 2) {
              setIsOpen(searchResults.length > 0);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="h-[41px] w-full text-[22px] border border-gray-300 box-border outline-none focus:border-[#f9c280] pr-12"
          style={{
            fontFamily: "Verdana, Arial, sans-serif",
            paddingLeft: `${50 + selectedType.label.length * 9 + 5}px`,
            paddingRight: "40px",
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {/* Search Icon */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Image src="/images/magnify.png" alt="Search" width={16} height={16} className="opacity-70" />
        </div>

        {/* Clear Button */}
        {searchValue && (
          <button onClick={handleClear} className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center">
            ×
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[99999999] bg-white border border-gray-300 border-t-0 shadow-lg h-[300px] overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : searchResults.length === 0 && searchValue.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : searchResults.length > 0 ? (
            <div className="h-full flex flex-col">
              {/* Header for search history */}
              {showHistory && searchValue.length === 0 && <div className="p-2 bg-gray-100 text-sm text-gray-600 border-b border-gray-200 flex-shrink-0">Recent Searches</div>}

              {/* Scrollable results area */}
              <div ref={listRef} className="flex-1 overflow-y-auto">
                {searchResults.map((result, index) => {
                  const displayInfo = getResultDisplayInfo(result);
                  return (
                    <div
                      key={`${result.location_id || result.name}-${index}`}
                      className={`flex items-center p-1.5 border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${index === highlightedIndex ? "bg-blue-100" : ""}`}
                      onClick={() => handleResultSelect(result)}
                    >
                      <div className="w-8 h-8 mr-3 flex-shrink-0 flex items-center justify-center">
                        <Image src={`/images/${result.imageName || "map-marker-light-blue.png"}`} alt="" width={24} height={24} className="max-w-full max-h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {/* Highlight search terms only if we're actively searching */}
                          {showHistory && searchValue.length === 0
                            ? result.name
                            : result.name.split(new RegExp(`(${searchValue})`, "gi")).map((part, i) => (
                                <span key={i} className={part.toLowerCase() === searchValue.toLowerCase() ? "font-bold bg-yellow-200" : ""}>
                                  {part}
                                </span>
                              ))}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{displayInfo.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Search;

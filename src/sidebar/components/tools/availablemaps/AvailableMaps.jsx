import React, { useState, useEffect } from "react";
import "./AvailableMaps.css";
import { FaExternalLinkAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { get } from "../../../../helpers/api";
import PanelComponent from "../../../PanelComponent";
import { default as config } from "./config.json";

const AvailableMaps = (props) => {
  const [securedMaps, setSecuredMaps] = useState([]);
  const [publicMaps, setPublicMaps] = useState([]);
  const [securedLoading, setSecuredLoading] = useState(true);
  const [publicLoading, setPublicLoading] = useState(true);
  const [securedError, setSecuredError] = useState(null);
  const [publicError, setPublicError] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [securedCollapsed, setSecuredCollapsed] = useState(false);
  const [publicCollapsed, setPublicCollapsed] = useState(false);
  const [retryCount, setRetryCount] = useState({ secured: 0, public: 0 });

  // Check if APIs are configured
  const hasSecuredApi = config.mapsSecureApiUrl && config.mapsSecureApiUrl.trim() !== "";
  const hasPublicApi = config.mapsPublicApiUrl && config.mapsPublicApiUrl.trim() !== "";

  const MAX_RETRY_ATTEMPTS = 2;

  const fetchSecuredMaps = async (isRetry = false) => {
    if (!hasSecuredApi) {
      setSecuredLoading(false);
      return;
    }

    if (!isRetry) {
      setRetryCount((prev) => ({ ...prev, secured: 0 }));
    }

    setSecuredLoading(true);
    setSecuredError(null);

    try {
      get(
        config.mapsSecureApiUrl,
        { useBearerToken: true },
        (result) => {
          try {
            console.log("Secured maps result:", result);

            // Handle various error scenarios
            if (!result) {
              setSecuredError("No response received from secured maps API");
              return;
            }

            // Check if result is an error string/object
            if (typeof result === "string" && result.toLowerCase().includes("error")) {
              setSecuredError(`API Error: ${result}`);
              return;
            }

            // Check if result has error property
            if (result.error) {
              setSecuredError(`API Error: ${result.error}`);
              return;
            }

            // Check if result is an array
            if (!Array.isArray(result)) {
              // If it's an object with a data property that's an array, use that
              if (result.data && Array.isArray(result.data)) {
                result = result.data;
              } else if (result.maps && Array.isArray(result.maps)) {
                result = result.maps;
              } else {
                setSecuredError("Invalid response format: expected array of maps");
                return;
              }
            }

            // Validate each map object has required properties
            const validMaps = result.filter((map) => {
              if (!map || typeof map !== "object") return false;
              if (!map.map_name || typeof map.map_name !== "string") return false;
              return true;
            });

            if (validMaps.length !== result.length) {
              console.warn(`Filtered out ${result.length - validMaps.length} invalid map entries from secured maps`);
            }

            setSecuredMaps(validMaps);
            setRetryCount((prev) => ({ ...prev, secured: 0 })); // Reset retry count on success
          } catch (err) {
            console.error("Error processing secured maps response:", err);
            setSecuredError(`Failed to process response: ${err.message}`);
          } finally {
            setSecuredLoading(false);
          }
        },
        (error) => {
          // This is the error callback for the get function
          console.error("Network error fetching secured maps:", error);
          setSecuredError(`Network error: ${error.message || "Failed to connect to secured maps API"}`);
          setSecuredLoading(false);
        }
      );
    } catch (err) {
      console.error("Unexpected error in fetchSecuredMaps:", err);
      setSecuredError(`Unexpected error: ${err.message}`);
      setSecuredLoading(false);
    }
  };

  const fetchPublicMaps = async (isRetry = false) => {
    if (!hasPublicApi) {
      setPublicLoading(false);
      return;
    }

    if (!isRetry) {
      setRetryCount((prev) => ({ ...prev, public: 0 }));
    }

    setPublicLoading(true);
    setPublicError(null);

    try {
      get(
        config.mapsPublicApiUrl,
        { useBearerToken: false },
        (result) => {
          try {
            console.log("Public maps result:", result);

            // Handle various error scenarios
            if (!result) {
              setPublicError("No response received from public maps API");
              return;
            }

            // Check if result is an error string/object
            if (typeof result === "string" && result.toLowerCase().includes("error")) {
              setPublicError(`API Error: ${result}`);
              return;
            }

            // Check if result has error property
            if (result.error) {
              setPublicError(`API Error: ${result.error}`);
              return;
            }

            // Check if result is an array
            if (!Array.isArray(result)) {
              // If it's an object with a data property that's an array, use that
              if (result.data && Array.isArray(result.data)) {
                result = result.data;
              } else if (result.maps && Array.isArray(result.maps)) {
                result = result.maps;
              } else {
                setPublicError("Invalid response format: expected array of maps");
                return;
              }
            }

            // Validate each map object has required properties
            const validMaps = result.filter((map) => {
              if (!map || typeof map !== "object") return false;
              if (!map.map_name || typeof map.map_name !== "string") return false;
              return true;
            });

            if (validMaps.length !== result.length) {
              console.warn(`Filtered out ${result.length - validMaps.length} invalid map entries from public maps`);
            }

            setPublicMaps(validMaps);
            setRetryCount((prev) => ({ ...prev, public: 0 })); // Reset retry count on success
          } catch (err) {
            console.error("Error processing public maps response:", err);
            setPublicError(`Failed to process response: ${err.message}`);
          } finally {
            setPublicLoading(false);
          }
        },
        (error) => {
          // This is the error callback for the get function
          console.error("Network error fetching public maps:", error);
          setPublicError(`Network error: ${error.message || "Failed to connect to public maps API"}`);
          setPublicLoading(false);
        }
      );
    } catch (err) {
      console.error("Unexpected error in fetchPublicMaps:", err);
      setPublicError(`Unexpected error: ${err.message}`);
      setPublicLoading(false);
    }
  };

  useEffect(() => {
    fetchSecuredMaps();
    fetchPublicMaps();
  }, [hasSecuredApi, hasPublicApi]);

  const handleRetrySecured = () => {
    const currentRetryCount = retryCount.secured + 1;
    setRetryCount((prev) => ({ ...prev, secured: currentRetryCount }));
    fetchSecuredMaps(true);
  };

  const handleRetryPublic = () => {
    const currentRetryCount = retryCount.public + 1;
    setRetryCount((prev) => ({ ...prev, public: currentRetryCount }));
    fetchPublicMaps(true);
  };

  const onClose = () => {
    props.onClose();
  };

  const handleMapClick = (mapName) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("MAP_ID", mapName);
    window.location.href = currentUrl.toString();
  };

  const handleNewTabClick = (e, mapName) => {
    e.stopPropagation(); // Prevent the main button click
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("MAP_ID", mapName);
    window.open(currentUrl.toString(), "_blank");
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };

  const clearFilter = () => {
    setFilterText("");
  };

  const toggleSecuredSection = () => {
    setSecuredCollapsed(!securedCollapsed);
  };

  const togglePublicSection = () => {
    setPublicCollapsed(!publicCollapsed);
  };

  const filterMaps = (maps) => {
    return maps.filter((map) => {
      const searchTerm = filterText.toLowerCase();
      const matchesName = map.map_name.toLowerCase().includes(searchTerm);
      const matchesDescription = map.description && map.description.toLowerCase().includes(searchTerm);
      return matchesName || matchesDescription;
    });
  };

  const filteredSecuredMaps = filterMaps(securedMaps);
  const filteredPublicMaps = filterMaps(publicMaps);
  const totalMaps = securedMaps.length + publicMaps.length;
  const totalFilteredMaps = filteredSecuredMaps.length + filteredPublicMaps.length;

  // Check if we should show collapsible controls (only when both sections are present)
  const showCollapsibleControls = hasSecuredApi && hasPublicApi;

  const renderMapsList = (maps, loading, error, sectionTitle, sectionClass, collapsed, toggleCollapsed, onRetry, currentRetryCount, showCollapsible = true) => {
    if (loading) {
      return (
        <div className={`sc-maps-section ${sectionClass} ${!showCollapsible ? "sc-single-section" : ""}`}>
          {showCollapsible && (
            <div className="sc-section-header" onClick={toggleCollapsed}>
              <h4 className="sc-section-title">{sectionTitle}</h4>
              <div className="sc-section-controls">
                <span className="sc-collapse-icon">{collapsed ? <FaChevronDown /> : <FaChevronUp />}</span>
              </div>
            </div>
          )}
          {(!showCollapsible || !collapsed) && (
            <div className="sc-loading">
              Loading {showCollapsible ? sectionTitle.toLowerCase() : "maps"}
              {currentRetryCount > 0 && ` (Attempt ${currentRetryCount + 1})`}...
            </div>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className={`sc-maps-section ${sectionClass} ${!showCollapsible ? "sc-single-section" : ""}`}>
          {showCollapsible && (
            <div className="sc-section-header" onClick={toggleCollapsed}>
              <h4 className="sc-section-title">{sectionTitle}</h4>
              <div className="sc-section-controls">
                <span className="sc-collapse-icon">{collapsed ? <FaChevronDown /> : <FaChevronUp />}</span>
              </div>
            </div>
          )}
          {(!showCollapsible || !collapsed) && (
            <div className="sc-error-container">
              <div className="sc-error">
                <div className="sc-error-message">
                  Error loading {showCollapsible ? sectionTitle.toLowerCase() : "maps"}: {error}
                </div>
                {currentRetryCount < MAX_RETRY_ATTEMPTS && (
                  <button className="sc-retry-btn" onClick={onRetry}>
                    Retry {currentRetryCount > 0 ? `(${currentRetryCount}/${MAX_RETRY_ATTEMPTS})` : ""}
                  </button>
                )}
                {currentRetryCount >= MAX_RETRY_ATTEMPTS && <div className="sc-retry-limit">Maximum retry attempts reached. Please check your configuration or try again later.</div>}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (maps.length === 0) {
      return (
        <div className={`sc-maps-section ${sectionClass} ${!showCollapsible ? "sc-single-section" : ""}`}>
          {showCollapsible && (
            <div className="sc-section-header" onClick={toggleCollapsed}>
              <h4 className="sc-section-title">{sectionTitle}</h4>
              <div className="sc-section-controls">
                <span className="sc-collapse-icon">{collapsed ? <FaChevronDown /> : <FaChevronUp />}</span>
              </div>
            </div>
          )}
          {(!showCollapsible || !collapsed) && <div className="sc-no-maps">No {showCollapsible ? sectionTitle.toLowerCase() : "maps"} available</div>}
        </div>
      );
    }

    return (
      <div className={`sc-maps-section ${sectionClass} ${!showCollapsible ? "sc-single-section" : ""}`}>
        {showCollapsible && (
          <div className="sc-section-header" onClick={toggleCollapsed}>
            <h4 className="sc-section-title">
              {sectionTitle} ({maps.length})
            </h4>
            <div className="sc-section-controls">
              <span className="sc-collapse-icon">{collapsed ? <FaChevronDown /> : <FaChevronUp />}</span>
            </div>
          </div>
        )}
        {(!showCollapsible || !collapsed) && (
          <>
            {maps.length === 0 && filterText && <div className="sc-no-results">No {showCollapsible ? sectionTitle.toLowerCase() : "maps"} match your filter criteria</div>}
            {maps.length > 0 && (
              <div className="sc-maps-list">
                {maps.map((map, index) => (
                  <div key={index} className="sc-map-item">
                    <button className="sc-map-link" onClick={() => handleMapClick(map.map_name)} title={map.description || `Switch to ${map.map_name} map`}>
                      <div className="sc-map-content">
                        <div className="sc-map-info">
                          <div className="sc-map-name">
                            {map.is_secured && (
                              <span className="sc-lock-icon" title="Secured map">
                                🔒
                              </span>
                            )}
                            {map.map_name}
                          </div>
                          {map.description && <div className="sc-map-description">{map.description}</div>}
                        </div>
                        <div className="sc-map-actions">
                          {map.is_default && <span className="sc-default-badge">Default</span>}
                          <button className="sc-new-tab-btn" onClick={(e) => handleNewTabClick(e, map.map_name)} title="Open in new tab" aria-label="Open in new tab">
                            <FaExternalLinkAlt />
                          </button>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <PanelComponent onClose={onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="tools">
      <div className="sc-tool-available-maps-container" style={{ fontSize: "11pt" }}>
        <div className="sc-maps-header">
          <h3>Available Maps</h3>
          <p>Click on a map name to switch to that map configuration.</p>
        </div>

        {(hasSecuredApi || hasPublicApi) && (
          <div className="sc-filter-container">
            <div className="sc-filter-input-wrapper">
              <input type="text" className="sc-filter-input" placeholder="Filter maps by name or description..." value={filterText} onChange={handleFilterChange} />
              {filterText && (
                <button className="sc-clear-filter" onClick={clearFilter} title="Clear filter" aria-label="Clear filter">
                  ×
                </button>
              )}
            </div>
            {filterText && (
              <div className="sc-filter-status">
                Showing {totalFilteredMaps} of {totalMaps} maps
              </div>
            )}
          </div>
        )}

        <div className={`sc-maps-sections ${!showCollapsibleControls ? "sc-single-section-container" : ""}`}>
          {hasSecuredApi &&
            renderMapsList(
              filteredSecuredMaps,
              securedLoading,
              securedError,
              "Secured Maps",
              "sc-secured-section",
              securedCollapsed,
              toggleSecuredSection,
              handleRetrySecured,
              retryCount.secured,
              showCollapsibleControls
            )}
          {hasPublicApi &&
            renderMapsList(
              filteredPublicMaps,
              publicLoading,
              publicError,
              "Public Maps",
              "sc-public-section",
              publicCollapsed,
              togglePublicSection,
              handleRetryPublic,
              retryCount.public,
              showCollapsibleControls
            )}
          {!hasSecuredApi && !hasPublicApi && (
            <div className="sc-no-config">
              <div className="sc-error">No map APIs configured. Please check your configuration.</div>
            </div>
          )}
        </div>
      </div>
    </PanelComponent>
  );
};

export default AvailableMaps;

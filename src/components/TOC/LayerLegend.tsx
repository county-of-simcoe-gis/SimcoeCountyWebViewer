"use client";

import React, { useState, useEffect } from "react";
import { FaImage, FaEyeSlash, FaListUl } from "react-icons/fa";
import { useLayerManagerStore } from "@/stores/layerManagerStore";

interface LayerLegendProps {
  legend: unknown | null;
  image: string | null;
  inline?: boolean;
  forceMode?: "inline" | "expandable"; // Allow parent to force a specific mode
  showLegend?: boolean; // Whether the expandable legend is currently shown
  onToggleLegend?: () => void; // Callback for toggling expandable legend
  styleUrl?: string; // For determining if legend is available
  renderToggleOnly?: boolean; // Only render the toggle button for inline placement
}

export type LegendDisplayMode = "inline" | "expandable" | "hidden";

// Additional export for toggle button component
export interface ToggleButtonProps {
  showLegend: boolean;
  onToggleLegend: () => void;
  hasLegend: boolean;
  styleUrl?: string;
}

export function LegendToggleButton({ showLegend, onToggleLegend, hasLegend, styleUrl = "" }: ToggleButtonProps) {
  return (
    <div
      className="inline-flex items-center cursor-pointer mx-2"
      role="button"
      onClick={(e) => {
        e.stopPropagation(); // Prevent label click and checkbox toggle
        onToggleLegend();
      }}
    >
      {styleUrl === "" && !hasLegend ? (
        <FaEyeSlash size={16} title="No Legend Available" className="text-base-content/70" />
      ) : (
        <FaListUl size={16} title={showLegend ? "Hide Legend" : "Show Legend"} className="text-base-content/70" />
      )}
    </div>
  );
}

interface LegendRule {
  title?: string;
  symbolizers?: LegendSymbolizer[];
}

interface LegendSymbolizer {
  Polygon?: {
    fill?: string;
    stroke?: string;
  };
  Line?: {
    stroke?: string;
  };
  Point?: {
    fill?: string;
    stroke?: string;
  };
}

interface LegendItem {
  imageData?: string;
  contentType?: string;
  width?: number;
  height?: number;
  label?: string;
}

const LayerLegendComponent = ({ legend, image, inline = false, forceMode, showLegend = false, onToggleLegend, styleUrl = "", renderToggleOnly = false }: LayerLegendProps) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<LegendDisplayMode>("hidden");
  const [isModeReady, setIsModeReady] = useState(false);
  const renderedImageRef = React.useRef<string | null>(null);

  // Reset loading state when image changes
  React.useEffect(() => {
    if (image && image !== renderedImageRef.current) {
      setIsImageLoading(true);
    }
  }, [image]);

  // Determine display mode based on image dimensions and props
  useEffect(() => {
    let isCancelled = false;

    const determineDisplayMode = async () => {
      if (isCancelled) return;

      // If parent forces a specific mode, use it (no loading state needed)
      if (forceMode) {
        if (!isCancelled) {
          setDisplayMode(forceMode);
          setIsModeReady(true);
        }
        return;
      }

      // If inline prop is explicitly set, use inline mode (no loading state needed)
      if (inline) {
        if (!isCancelled) {
          setDisplayMode("inline");
          setIsModeReady(true);
        }
        return;
      }

      // If we have an image, check its dimensions
      if (image) {
        try {
          const { getCachedImage, cacheImage } = useLayerManagerStore.getState();
          let imageInfo = getCachedImage(image);

          // If already cached, we can set the mode immediately without showing loading
          if (imageInfo && !imageInfo.isLoading) {
            if (!isCancelled) {
              // Determine mode based on cached dimensions
              if (imageInfo.error) {
                setDisplayMode("hidden");
              } else if (imageInfo.width <= 30 && imageInfo.height <= 30) {
                setDisplayMode("inline");
              } else {
                setDisplayMode("expandable");
              }
              setIsModeReady(true);
            }
            return;
          }

          // Only show loading state if we need to cache the image
          if (!isCancelled) {
            setIsModeReady(false);
          }

          // Cache the image if not already cached
          if (!imageInfo) {
            imageInfo = await cacheImage(image);
          } else {
          }

          // If component was unmounted during async operation, don't update state
          if (isCancelled) return;

          // Determine mode based on dimensions
          if (imageInfo.error) {
            setDisplayMode("hidden");
          } else if (imageInfo.width <= 30 && imageInfo.height <= 30) {
            setDisplayMode("inline");
          } else {
            setDisplayMode("expandable");
          }
        } catch (error) {
          if (!isCancelled) {
            console.warn("Error determining legend display mode:", error);
            setDisplayMode("expandable"); // Default to expandable on error
          }
        }
      } else if (legend) {
        // If we have legend object data, always show as expandable (no loading state needed)
        if (!isCancelled) {
          setDisplayMode("expandable");
        }
      } else {
        // No legend data available
        if (!isCancelled) {
          setDisplayMode("hidden");
        }
      }

      if (!isCancelled) {
        setIsModeReady(true);
      }
    };

    determineDisplayMode();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [image, legend, inline, forceMode]);

  // Reset image loading state when image URL actually changes
  useEffect(() => {
    // Check if the image is already cached
    if (image) {
      const { getCachedImage } = useLayerManagerStore.getState();
      const imageInfo = getCachedImage(image);

      // Only set loading state if image is not cached or is currently loading
      if (!imageInfo || imageInfo.isLoading) {
        setIsImageLoading(true);
      } else {
        setIsImageLoading(false);
      }
    } else if (legend) {
      setIsImageLoading(false);
    }
  }, [image, legend]);

  // Debug logging
  // console.log('LayerLegend props:', { legend, image, displayMode, isImageLoading, isModeReady });

  // If only rendering toggle button, return it early
  if (renderToggleOnly && onToggleLegend) {
    return <LegendToggleButton showLegend={showLegend} onToggleLegend={onToggleLegend} hasLegend={!!(legend || image)} styleUrl={styleUrl} />;
  }

  // If no legend data available, show nothing
  if (!legend && !image) {
    // console.log('LayerLegend: No legend or image data, returning null');
    return null;
  }

  // Show loading placeholder immediately if mode is not ready yet
  if (!isModeReady) {
    // Show a generic loading placeholder while determining mode
    return (
      <div className="relative inline-block">
        <div className="flex items-center justify-center bg-gray-200 animate-pulse rounded-sm w-6 h-6">
          <FaImage size={12} className="text-gray-500" />
        </div>
      </div>
    );
  }

  // If hidden mode, show nothing
  if (displayMode === "hidden") {
    // console.log('LayerLegend: Hidden mode, returning null');
    return null;
  }

  // If we have an image URL, display it
  if (image) {
    // Mark this image as rendered to prevent re-fetching
    if (renderedImageRef.current !== image) {
      renderedImageRef.current = image;
    }

    // For inline mode (small images), return just the image
    if (displayMode === "inline") {
      return (
        <div className="relative inline-block">
          {isImageLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200 animate-pulse rounded-sm">
              <FaImage size={12} className="text-gray-500" />
            </div>
          )}
          <img
            key={image}
            src={image}
            alt="Layer Legend"
            width={25}
            height={25}
            className="inline-block align-middle mx-1"
            loading="lazy"
            onError={(e) => {
              setIsImageLoading(false);
              (e.target as HTMLImageElement).style.display = "none";
            }}
            onLoad={() => setIsImageLoading(false)}
          />
        </div>
      );
    }
    // For expandable legends - just show content when expanded, toggle handled elsewhere
    if (displayMode === "expandable") {
      return (
        <div className="relative inline-block">
          {isImageLoading && (
            <div className="flex items-center justify-center bg-gray-200 animate-pulse rounded-sm w-6 h-6">
              <FaImage size={24} className="text-gray-500" />
            </div>
          )}
          <img
            key={image}
            src={image}
            alt="Layer Legend"
            className="w-auto h-auto"
            style={{ width: "auto", height: "auto" }}
            loading="lazy"
            onError={(e) => {
              setIsImageLoading(false);
              // console.log('LayerLegend: Image failed to load:', image);
              // Hide broken images
              (e.target as HTMLImageElement).style.display = "none";
            }}
            onLoad={(e) => {
              setIsImageLoading(false);
              const img = e.target as HTMLImageElement;
              // console.log('LayerLegend: Image loaded successfully. Dimensions:', img.naturalWidth, 'x', img.naturalHeight);

              // Check if this is a small image and apply conditional styling
              if (img.naturalWidth <= 30 && img.naturalHeight <= 30) {
                const container = img.closest(".mx-1") as HTMLElement;
                if (container) {
                  // Remove margin for small images that should be inline
                  container.className = "my-0.5";
                }
              }
            }}
          />
        </div>
      );
    }
  }

  // If we have legend object data, try to render it
  if (legend) {
    // Helper function to render legend content
    const renderLegendContent = () => {
      try {
        // Handle different types of legend objects
        if (typeof legend === "string") {
          // If it's a string, it might be HTML or a URL
          if (legend.startsWith("http")) {
            return (
              <div className="mx-1 my-0.5">
                <div className="relative">
                  {isImageLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200 animate-pulse rounded-sm min-h-[60px]">
                      <FaImage size={24} className="text-gray-500" />
                    </div>
                  )}
                  <img
                    src={legend}
                    alt="Layer Legend"
                    className="w-auto h-auto"
                    style={{ width: "auto", height: "auto" }}
                    onError={(e) => {
                      setIsImageLoading(false);
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    onLoad={() => setIsImageLoading(false)}
                  />
                </div>
              </div>
            );
          } else {
            // Assume it's HTML content - no loading state needed
            return <div className="mx-1 my-0.5" dangerouslySetInnerHTML={{ __html: legend }} />;
          }
        }

        // Handle legend object with rules (common GeoServer format)
        if (typeof legend === "object" && legend !== null) {
          const legendObj = legend as Record<string, unknown>;

          // Handle text type legend (our fallback)
          if (legendObj.type === "text" && legendObj.content) {
            return (
              <div className="mx-1 my-0.5">
                <span className="text-xs text-gray-600">{legendObj.content as string}</span>
              </div>
            );
          }

          // Handle GeoServer style object
          if (legendObj.rules && Array.isArray(legendObj.rules)) {
            return (
              <div className="mx-1 my-0.5">
                {legendObj.rules.map((rule: LegendRule, index: number) => (
                  <div key={index} className="mb-1 flex items-center">
                    {rule.symbolizers &&
                      Array.isArray(rule.symbolizers) &&
                      rule.symbolizers.map((symbolizer: LegendSymbolizer, symIndex: number) => (
                        <div key={symIndex} className="flex items-center mb-0.5">
                          {symbolizer.Polygon && (
                            <div
                              className="inline-block mr-1 w-5 h-5"
                              style={{
                                backgroundColor: symbolizer.Polygon.fill || "#cccccc",
                                border: `1px solid ${symbolizer.Polygon.stroke || "#000000"}`,
                              }}
                            />
                          )}
                          {symbolizer.Line && (
                            <div
                              className="inline-block mr-1 w-5 h-px"
                              style={{
                                borderTop: `2px solid ${symbolizer.Line.stroke || "#000000"}`,
                              }}
                            />
                          )}
                          {symbolizer.Point && (
                            <div
                              className="inline-block mr-1 w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: symbolizer.Point.fill || "#cccccc",
                                border: `1px solid ${symbolizer.Point.stroke || "#000000"}`,
                              }}
                            />
                          )}
                          {rule.title && <span className="text-xs text-gray-700 ml-1">{rule.title}</span>}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            );
          }

          // Handle other legend object formats
          if (legendObj.legend && Array.isArray(legendObj.legend)) {
            return (
              <div className="mx-1 my-0.5">
                {legendObj.legend.map((item: LegendItem, index: number) => (
                  <div key={index} className="flex items-center mb-1 gap-1">
                    {item.imageData && (
                      <div className="relative inline-block">
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200 animate-pulse rounded-sm">
                          <FaImage size={8} className="text-gray-500" />
                        </div>
                        <img
                          src={`data:${item.contentType};base64,${item.imageData}`}
                          alt={item.label || "Legend item"}
                          width={item.width || 20}
                          height={item.height || 20}
                          onLoad={(e) => {
                            // Hide the loading placeholder
                            const placeholder = (e.target as HTMLElement).parentElement?.querySelector(".absolute");
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = "none";
                            }
                          }}
                        />
                      </div>
                    )}
                    {item.label && <span className="text-xs text-gray-700">{item.label}</span>}
                  </div>
                ))}
              </div>
            );
          }
        }

        // Fallback: try to display as JSON for debugging
        return (
          <div className="mx-1 my-0.5">
            <pre className="text-xs text-gray-600 bg-gray-100 p-1 rounded-sm max-h-24 overflow-y-auto">{JSON.stringify(legend, null, 2)}</pre>
          </div>
        );
      } catch {
        // console.error('Error rendering legend:', error);
        return (
          <div className="mx-1 my-0.5">
            <span className="text-xs text-gray-400 italic">Legend format not supported</span>
          </div>
        );
      }
    };

    // For expandable mode, just render content directly (toggle handled elsewhere)
    // For inline mode or when no toggle callback, render directly
    return renderLegendContent();
  }

  return null;
};

// Memoize the component to prevent unnecessary re-renders
const LayerLegend = React.memo(LayerLegendComponent);
export default LayerLegend;

// Helper hook to get legend display mode without rendering
export function useLegendDisplayMode(image: string | null, legend: unknown | null): LegendDisplayMode {
  const [displayMode, setDisplayMode] = useState<LegendDisplayMode>("hidden");
  const checkedImageRef = React.useRef<string | null>(null);
  const displayModeRef = React.useRef<LegendDisplayMode>("hidden");

  useEffect(() => {
    let isCancelled = false;

    const determineDisplayMode = async () => {
      if (isCancelled) return;

      // If we have an image, check its dimensions
      if (image) {
        // Skip if we've already determined the mode for this image
        if (image === checkedImageRef.current && displayModeRef.current !== "hidden") {
          return;
        }

        try {
          const { getCachedImage, cacheImage } = useLayerManagerStore.getState();
          const cachedInfo = getCachedImage(image);

          // If we have a valid cached entry (not loading, no error), use it immediately
          if (cachedInfo && !cachedInfo.isLoading && !cachedInfo.error) {
            // If component was unmounted during check, don't update state
            if (isCancelled) return;

            // Mark this image as checked
            checkedImageRef.current = image;

            // Determine mode based on cached dimensions
            const newMode = cachedInfo.width <= 30 && cachedInfo.height <= 30 ? "inline" : "expandable";
            displayModeRef.current = newMode;
            setDisplayMode(newMode);
            return;
          }

          // Only call cacheImage if we don't have valid cached data
          if (!cachedInfo || cachedInfo.isLoading || cachedInfo.error) {
            const imageInfo = await cacheImage(image);

            // If component was unmounted during async operation, don't update state
            if (isCancelled) return;

            // Mark this image as checked
            checkedImageRef.current = image;

            // Determine mode based on dimensions
            let newMode: LegendDisplayMode = "hidden";
            if (imageInfo.error) {
              newMode = "hidden";
            } else if (imageInfo.width <= 30 && imageInfo.height <= 30) {
              newMode = "inline";
            } else {
              newMode = "expandable";
            }
            displayModeRef.current = newMode;
            setDisplayMode(newMode);
          }
        } catch (error) {
          if (!isCancelled) {
            console.warn("Error determining legend display mode:", error);
            displayModeRef.current = "expandable";
            setDisplayMode("expandable"); // Default to expandable on error
          }
        }
      } else if (legend) {
        // If we have legend object data, always show as expandable
        if (!isCancelled && displayModeRef.current !== "expandable") {
          displayModeRef.current = "expandable";
          setDisplayMode("expandable");
        }
      } else {
        // No legend data available
        if (!isCancelled && displayModeRef.current !== "hidden") {
          displayModeRef.current = "hidden";
          setDisplayMode("hidden");
        }
      }
    };

    determineDisplayMode();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [image, legend]);

  return displayMode;
}

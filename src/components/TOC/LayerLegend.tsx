"use client";

import React from "react";
import "./LayerLegend.css";

interface LayerLegendProps {
  legend: unknown | null;
  image: string | null;
  inline?: boolean;
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

export default function LayerLegend({ legend, image, inline = false }: LayerLegendProps) {
  // Debug logging
  // console.log('LayerLegend props:', { legend, image });

  // If no legend data available, show nothing
  if (!legend && !image) {
    // console.log('LayerLegend: No legend or image data, returning null');
    return null;
  }

  // If we have an image URL, display it
  if (image) {
    // console.log('LayerLegend: Rendering image:', image);

    // For inline mode (20x20 images), return just the image
    if (inline) {
      return <img src={image} alt="Layer Legend" className="sc-toc-legend-inline" style={{ width: "20px", height: "20px", marginLeft: "4px", marginRight: "4px" }} />;
    }

    // For regular expandable legends
    return (
      <div className="sc-toc-legend-container">
        <img
          src={image}
          alt="Layer Legend"
          className="sc-toc-legend-image"
          onError={(e) => {
            // console.log('LayerLegend: Image failed to load:', image);
            // Hide broken images
            (e.target as HTMLImageElement).style.display = "none";
          }}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            // console.log('LayerLegend: Image loaded successfully. Dimensions:', img.naturalWidth, 'x', img.naturalHeight);

            // Check if this is a 20x20 image and apply conditional styling
            if (img.naturalWidth === 20 && img.naturalHeight === 20) {
              const container = img.closest(".sc-toc-legend-container") as HTMLElement;
              if (container) {
                // Remove border, background, and padding for 20x20 images
                container.style.border = "none";
                container.style.background = "none";
                container.style.padding = "0";
              }
            }
          }}
        />
      </div>
    );
  }

  // If we have legend object data, try to render it
  if (legend) {
    try {
      // Handle different types of legend objects
      if (typeof legend === "string") {
        // If it's a string, it might be HTML or a URL
        if (legend.startsWith("http")) {
          return (
            <div className="sc-toc-legend-container">
              <img
                src={legend}
                alt="Layer Legend"
                className="sc-toc-legend-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          );
        } else {
          // Assume it's HTML content
          return <div className="sc-toc-legend-container" dangerouslySetInnerHTML={{ __html: legend }} />;
        }
      }

      // Handle legend object with rules (common GeoServer format)
      if (typeof legend === "object" && legend !== null) {
        const legendObj = legend as Record<string, unknown>;

        // Handle text type legend (our fallback)
        if (legendObj.type === "text" && legendObj.content) {
          return (
            <div className="sc-toc-legend-container">
              <span className="sc-toc-legend-text">{legendObj.content as string}</span>
            </div>
          );
        }

        // Handle GeoServer style object
        if (legendObj.rules && Array.isArray(legendObj.rules)) {
          return (
            <div className="sc-toc-legend-container">
              {legendObj.rules.map((rule: LegendRule, index: number) => (
                <div key={index} className="sc-toc-legend-rule">
                  {rule.symbolizers &&
                    Array.isArray(rule.symbolizers) &&
                    rule.symbolizers.map((symbolizer: LegendSymbolizer, symIndex: number) => (
                      <div key={symIndex} className="sc-toc-legend-symbolizer">
                        {symbolizer.Polygon && (
                          <div
                            className="sc-toc-legend-polygon"
                            style={{
                              backgroundColor: symbolizer.Polygon.fill || "#cccccc",
                              border: `1px solid ${symbolizer.Polygon.stroke || "#000000"}`,
                              width: "20px",
                              height: "20px",
                              display: "inline-block",
                              marginRight: "5px",
                            }}
                          />
                        )}
                        {symbolizer.Line && (
                          <div
                            className="sc-toc-legend-line"
                            style={{
                              borderTop: `2px solid ${symbolizer.Line.stroke || "#000000"}`,
                              width: "20px",
                              height: "1px",
                              display: "inline-block",
                              marginRight: "5px",
                            }}
                          />
                        )}
                        {symbolizer.Point && (
                          <div
                            className="sc-toc-legend-point"
                            style={{
                              backgroundColor: symbolizer.Point.fill || "#cccccc",
                              border: `1px solid ${symbolizer.Point.stroke || "#000000"}`,
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              display: "inline-block",
                              marginRight: "5px",
                            }}
                          />
                        )}
                        {rule.title && <span className="sc-toc-legend-rule-title">{rule.title}</span>}
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
            <div className="sc-toc-legend-container">
              {legendObj.legend.map((item: LegendItem, index: number) => (
                <div key={index} className="sc-toc-legend-item">
                  {item.imageData && (
                    <img src={`data:${item.contentType};base64,${item.imageData}`} alt={item.label || "Legend item"} style={{ width: `${item.width}px`, height: `${item.height}px` }} />
                  )}
                  {item.label && <span className="sc-toc-legend-rule-title">{item.label}</span>}
                </div>
              ))}
            </div>
          );
        }
      }

      // Fallback: try to display as JSON for debugging
      return (
        <div className="sc-toc-legend-container">
          <pre className="sc-toc-legend-debug">{JSON.stringify(legend, null, 2)}</pre>
        </div>
      );
    } catch {
      // console.error('Error rendering legend:', error);
      return (
        <div className="sc-toc-legend-container">
          <span className="sc-toc-legend-text">Legend format not supported</span>
        </div>
      );
    }
  }

  return null;
}

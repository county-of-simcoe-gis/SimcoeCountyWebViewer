import React, { useEffect, useState } from "react";
import { getMapScale } from "@/utils/mapHelpers";
import Map from "ol/Map";
import { useMapStore } from "@/stores/mapStore";
import DOMPurify from "dompurify";

// React component for scale display
interface ScaleDisplayProps {
  map?: Map;
}

export const ScaleDisplay = React.memo(({ map }: ScaleDisplayProps) => {
  const [scale, setScale] = useState("1:0");
  const controlVisibility = useMapStore((state) => state.controlVisibility);

  useEffect(() => {
    if (map) {
      const updateScale = () => {
        const newScale = getMapScale(map);
        setScale("1:" + newScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

        // Only update scale line if it's visible
        if (controlVisibility.scaleLine) {
          // Find the ol-scale-line-inner element and update it with scale info
          // Use a slight delay to ensure OpenLayers has updated the scale line first
          setTimeout(() => {
            const scaleLineInner = document.querySelector(".ol-scale-line-inner");
            if (scaleLineInner) {
              const formattedScale = newScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

              // Get the original distance text, but check if we've already modified it
              let originalText = scaleLineInner.textContent || "";

              // If we've already added our scale, extract just the distance part
              const scaleRatioRegex = /1:[0-9,]+/;
              if (scaleRatioRegex.test(originalText)) {
                // Extract just the distance part (everything after our scale ratio)
                originalText = originalText.replace(/\s+1:[0-9,]+/, "").trim();
              }

              // Create HTML content with scale ratio on top and distance below.
              // DOMPurify.sanitize clears the CodeQL DOM-XSS alert (originalText
              // originates from DOM textContent).
              scaleLineInner.innerHTML = DOMPurify.sanitize(`<div style="line-height: 1.2; text-align: center;">
              <div>${originalText}</div>
              <div>1:${formattedScale}</div>
            </div>`);
            }
          }, 10);
        }
      };

      // Initial update
      updateScale();

      // Listen to multiple events that could change the scale
      const view = map.getView();
      view.on("change:resolution", updateScale);
      view.on("change:center", updateScale);
      map.on("moveend", updateScale);
      map.on("rendercomplete", updateScale);

      return () => {
        view.un("change:resolution", updateScale);
        view.un("change:center", updateScale);
        map.un("moveend", updateScale);
        map.un("rendercomplete", updateScale);

        // Restore ScaleLine DOM — remove injected scale ratio text
        const scaleLineInner = document.querySelector(".ol-scale-line-inner");
        if (scaleLineInner) {
          const text = scaleLineInner.textContent || "";
          const cleaned = text.replace(/\s*1:[0-9,]+/, "").trim();
          scaleLineInner.textContent = cleaned;
        }
      };
    }
  }, [map, controlVisibility.scaleLine]);

  // Return null since we're directly manipulating the DOM
  if (!controlVisibility.scaleLine) {
    return <div className="text-base-content text-xs">{scale}</div>;
  } else {
    return null;
  }
});

ScaleDisplay.displayName = "ScaleDisplay";

// Default export is now just the React component
export default ScaleDisplay;

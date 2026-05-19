import React, { useEffect, useState } from "react";
import Map from "ol/Map";
import { Layer } from "ol/layer";
// React component for custom attribution display
interface AttributionControlProps {
  map?: Map;
}

export const AttributionControl = React.memo(({ map }: AttributionControlProps) => {
  const [attributions, setAttributions] = useState<string[]>([]);

  useEffect(() => {
    if (!map) return;

    const updateAttributions = () => {
      const attributionSet = new Set<string>();

      // Collect attributions from all visible layers
      map.getLayers().forEach((layer) => {
        if (layer.getVisible() && "getSource" in layer) {
          const source = (layer as Layer).getSource();
          if (source && source.getAttributions) {
            const layerAttributions = source.getAttributions();
            if (layerAttributions) {
              (layerAttributions as unknown as string[]).forEach((attribution: string) => {
                if (attribution) {
                  // Clean up HTML tags if present
                  const cleanAttribution = attribution.replace(/<[^>]*>/g, "").trim();
                  if (cleanAttribution) {
                    attributionSet.add(cleanAttribution);
                  }
                }
              });
            }
          }
        }
      });

      setAttributions(Array.from(attributionSet));
    };

    // Initial update
    updateAttributions();

    // Listen for layer changes
    map.getLayers().on("add", updateAttributions);
    map.getLayers().on("remove", updateAttributions);
    map.on("moveend", updateAttributions);

    return () => {
      map.getLayers().un("add", updateAttributions);
      map.getLayers().un("remove", updateAttributions);
      map.un("moveend", updateAttributions);
    };
  }, [map]);

  if (attributions.length === 0) {
    return null;
  }

  return (
    <div className="bg-base-100/80 text-xs text-base-content/70 px-2 py-1 rounded shadow-sm max-w-xs">
      {attributions.map((attribution, index) => (
        <div key={index} className="leading-tight">
          {attribution}
        </div>
      ))}
    </div>
  );
});

AttributionControl.displayName = "AttributionControl";

// Default export is now just the React component
export default AttributionControl;

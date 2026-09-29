"use client";

import React, { useEffect, useState } from "react";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";
import { InfoRow } from "@/components/common/InfoRow";
import { SectionTitle } from "@/components/ui";

interface IdentifyQueryProps {
  title: string;
  layerURL: string;
  layerId: string;
  where: string;
  fields: string[];
  secured?: boolean;
  type?: string;
}

interface FeatureAttributes {
  [key: string]: unknown;
}

/**
 * Performs an ArcGIS REST query and displays the results as collapsible attribute rows.
 * Mirrors the old app's IdentifyQuery.jsx functionality.
 */
export default function IdentifyQuery({ title, layerURL, layerId, where, fields, secured }: IdentifyQueryProps) {
  const [features, setFeatures] = useState<FeatureAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const outFields = fields.join(",");
        // Normalize layerURL to avoid double slashes (e.g. "MapServer//1/query")
        const baseUrl = layerURL.replace(/\/+$/, "");
        let queryUrl = `${baseUrl}/${layerId}/query?where=${encodeURIComponent(where)}&outFields=${encodeURIComponent(outFields)}&f=json`;

        if (secured) {
          const token = await useArcGISTokenStore.getState().getValidToken();
          if (token) {
            queryUrl += `&token=${token}`;
          } else {
            setError("Authentication required. Please sign in to access this data.");
            setIsLoading(false);
            return;
          }
        }
        const response = await fetch(queryUrl, { method: "GET", mode: "cors" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || "ArcGIS query error");
        }

        const resultFeatures = (data.features || []).map((f: { attributes: FeatureAttributes }) => f.attributes);
        setFeatures(resultFeatures);
      } catch (err) {
        console.error("IdentifyQuery error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [layerURL, layerId, where, fields, secured]);

  if (isLoading) {
    return <div className="p-2.5 text-xs text-base-content/70">Loading {title}...</div>;
  }

  if (error) {
    return (
      <div className="p-2.5 text-xs text-error">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (features.length === 0) {
    return <div className="p-2.5 text-xs text-base-content/70">No results found for {title}.</div>;
  }

  return (
    <div className="p-[5px]">
      <SectionTitle className="border-b-base-300">{title}</SectionTitle>
      {features.map((attrs, featureIdx) => (
        <div key={featureIdx} className="mb-2.5">
          {features.length > 1 && <div className="font-bold text-xs text-base-content mb-1">Feature {featureIdx + 1}</div>}
          {Object.entries(attrs)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .map(([key, value]) => (
              <InfoRow key={`${featureIdx}-${key}`} label={key} value={String(value)} />
            ))}
        </div>
      ))}
    </div>
  );
}

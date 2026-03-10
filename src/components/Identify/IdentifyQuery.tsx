"use client";

import React, { useEffect, useState } from "react";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";
import { InfoRow } from "@/components/common/InfoRow";

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

  console.log("IdentifyQuery mounted with:", { title, layerURL, layerId, where, fields, secured });

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

        console.log("IdentifyQuery fetching URL:", queryUrl);
        const response = await fetch(queryUrl, { method: "GET", mode: "cors" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("IdentifyQuery response:", data);

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
    return <div style={{ padding: "10px", fontSize: "12px", color: "#666" }}>Loading {title}...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "10px", fontSize: "12px", color: "#c00" }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (features.length === 0) {
    return <div style={{ padding: "10px", fontSize: "12px", color: "#666" }}>No results found for {title}.</div>;
  }

  return (
    <div style={{ padding: "5px" }}>
      <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>{title}</div>
      {features.map((attrs, featureIdx) => (
        <div key={featureIdx} style={{ marginBottom: "10px" }}>
          {features.length > 1 && (
            <div style={{ fontWeight: "bold", fontSize: "12px", color: "#333", marginBottom: "4px" }}>
              Feature {featureIdx + 1}
            </div>
          )}
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

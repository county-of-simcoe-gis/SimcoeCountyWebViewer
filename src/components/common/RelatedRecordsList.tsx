"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import { fetchArcgisRelatedRecords, getRelatedTableUrl } from "@/lib/attributeTable/arcgis";
import { filterPropertyKeys, formatFieldName, formatFieldValue } from "@/utils/identifyHelpers";
import { getArcgisFieldMetadata, resolveDomainName, resolveFieldAlias, type ArcgisLayerFieldMetadata, type ArcgisRelationship } from "@/utils/arcgisFieldMetadata";

/** Origin relationships to show for one feature; empty when the layer or feature has no OBJECTID. */
export function getRelatedRelationships(metadata: ArcgisLayerFieldMetadata | null | undefined, objectId: string | null): ArcgisRelationship[] {
  if (!metadata?.layerUrl || objectId === null) return [];
  return metadata.relationships ?? [];
}

interface RelatedRecordsListProps {
  metadata: ArcgisLayerFieldMetadata | null | undefined;
  relationship: ArcgisRelationship;
  objectId: string | null;
  showAllFields?: boolean;
}

interface RelatedState {
  status: "loading" | "ready" | "error";
  records: Record<string, unknown>[];
  relatedMetadata: ArcgisLayerFieldMetadata | null;
}

/** Epoch-ms values are formatted in local time; formatFieldValue uses UTC. */
function formatRelatedValue(key: string, value: unknown, fieldMetadata: ArcgisLayerFieldMetadata | null): ReactNode {
  const domainName = resolveDomainName(fieldMetadata, key, value);
  if (domainName !== undefined) return domainName;
  if (typeof value === "number" && value > 1000000000) {
    return new Date(value).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" });
  }
  return formatFieldValue(key, value);
}

function relatedItemLabel(record: Record<string, unknown>, relatedMetadata: ArcgisLayerFieldMetadata | null, index: number): ReactNode {
  const displayField = relatedMetadata?.displayField;
  const raw = displayField ? record[displayField] : undefined;
  if (displayField && raw !== null && raw !== undefined && typeof raw !== "object") {
    return formatRelatedValue(displayField, raw, relatedMetadata) ?? String(raw);
  }
  return `Related item ${index + 1}`;
}

const RelatedRecordFields: React.FC<{ record: Record<string, unknown>; fieldMetadata: ArcgisLayerFieldMetadata | null; showAllFields: boolean }> = ({ record, fieldMetadata, showAllFields }) => {
  const keys = filterPropertyKeys(record, showAllFields).filter((key) => record[key] === null || typeof record[key] !== "object");
  return (
    <div className="flex flex-col gap-1">
      {keys.map((key) => {
        const label = resolveFieldAlias(fieldMetadata, key) ?? formatFieldName(key);
        const value = formatRelatedValue(key, record[key], fieldMetadata);
        return (
          <div key={key} className="grid grid-cols-[120px_1fr] gap-2 text-xs max-[768px]:grid-cols-1">
            <div className="font-semibold text-base-content/70 break-words">{label}:</div>
            <div className="text-base-content break-words [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline">{value !== null ? value : "N/A"}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Related items for one relationship, listed like attachments; clicking an item shows its fields. */
export const RelatedRecordsList: React.FC<RelatedRecordsListProps> = ({ metadata, relationship, objectId, showAllFields = false }) => {
  const layerUrl = metadata?.layerUrl;
  const secured = metadata?.secured ?? false;
  const [state, setState] = useState<RelatedState>({ status: "loading", records: [], relatedMetadata: null });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!layerUrl || objectId === null) return;
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading" }));
    Promise.all([
      fetchArcgisRelatedRecords({ layerUrl, secured, objectId, relationshipId: relationship.id }),
      getArcgisFieldMetadata(getRelatedTableUrl(layerUrl, relationship.relatedTableId), { secured }),
    ])
      .then(([records, relatedMetadata]) => {
        if (!cancelled) setState({ status: "ready", records, relatedMetadata });
      })
      .catch((err) => {
        console.error("Failed to fetch related records:", err);
        if (!cancelled) setState((prev) => ({ ...prev, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [layerUrl, secured, objectId, relationship.id, relationship.relatedTableId, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  if (!layerUrl || objectId === null) return null;

  if (state.status === "loading") {
    return <span className="text-xs text-gray-400 italic">Loading related items...</span>;
  }

  if (state.status === "error") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-error">
        <span>Related items failed to load.</span>
        <button type="button" className="btn btn-xs btn-outline btn-error" onClick={handleRetry} aria-label={`Retry loading ${relationship.name}`}>
          Retry
        </button>
      </span>
    );
  }

  if (state.records.length === 0) {
    return <span className="text-xs text-gray-400 italic">No related items.</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {state.records.map((record, idx) => {
        const isOpen = expanded === idx;
        const toggle = () => setExpanded(isOpen ? null : idx);
        return (
          <div key={idx} className="flex flex-col gap-1">
            <span
              className="text-blue-600 underline cursor-pointer hover:text-blue-800 text-xs w-fit"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggle();
              }}
            >
              {relatedItemLabel(record, state.relatedMetadata, idx)}
            </span>
            {isOpen && (
              <div className="ml-2 pl-2 border-l-2 border-base-300">
                <RelatedRecordFields record={record} fieldMetadata={state.relatedMetadata} showAllFields={showAllFields} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

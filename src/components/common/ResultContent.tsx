"use client";

import type { ReactNode } from "react";
import PropertyPopup from "@/components/PropertyPopup";
import type { Result } from "@/components/ResultsPopup";
import { InfoRow } from "@/components/common/InfoRow";
import { RelatedRecordsList, getRelatedRelationships, relationshipLabel } from "@/components/common/RelatedRecordsList";
import { getArcgisObjectId } from "@/lib/attributeTable/arcgis";
import { isExcludedKey } from "@/utils/identifyHelpers";
import { resolveDomainName, resolveFieldAlias } from "@/utils/arcgisFieldMetadata";

interface ResultContentOptions {
  onClose?: () => void;
  onClearParcelLayer?: () => void;
}

/** Full detail view for one result; shared by the map popup and the Reports tab. */
export function renderResultContent(result: Result, { onClose, onClearParcelLayer }: ResultContentOptions = {}): ReactNode {
  // Check for type-safe custom render function first (preferred)
  if (result.renderContent) {
    return result.renderContent();
  }

  switch (result.type) {
    case "property":
    case "condo":
      if (result.data.propInfo && result.data.feature) {
        return <PropertyPopup propInfo={result.data.propInfo} feature={result.data.feature} onClose={onClose} onClearParcelLayer={onClearParcelLayer} />;
      }
      return (
        <div className="flex items-center justify-center py-12 px-6 text-center text-base-content/70">
          <p>Loading property details...</p>
        </div>
      );

    case "identify":
    case "layer":
      return (
        <div className="px-5 pt-1.5 pb-5">
          <h3 className="m-0 mb-2 text-[13px] font-semibold text-base-content leading-normal">{result.data.layerName}</h3>
          <div className="mt-4" data-testid="result-attributes">
            <div className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-2 gap-y-1.5 items-start text-xs">
              {Object.entries(result.data.attributes)
                .filter(([key, value]) => {
                  const meta = result.data.fieldMetadata;
                  const alias = resolveFieldAlias(meta, key);
                  // Keep system fields when the service provides a meaningful alias.
                  return (result.data.showAllFields || !isExcludedKey(key, alias)) && key !== "bbox" && typeof value !== "object";
                })
                .map(([key, value]) => {
                  // ArcGIS layers: prefer the field alias for the label and
                  // the coded-value domain name for the value, when available.
                  const meta = result.data.fieldMetadata;
                  const alias = resolveFieldAlias(meta, key);
                  const domainName = resolveDomainName(meta, key, value);
                  return <InfoRow key={key} label={key} labelOverride={alias} value={domainName ?? (value != null ? String(value) : "")} styleMode="grid" />;
                })}
              {getRelatedRelationships(result.data.fieldMetadata, getArcgisObjectId(result.data.attributes)).map((relationship) => (
                <div key={`related-${relationship.id}`} className="col-span-2 flex flex-col gap-1 text-xs">
                  <div className="font-semibold text-base-content break-words">{relationshipLabel(relationship.name)}:</div>
                  <RelatedRecordsList metadata={result.data.fieldMetadata} relationship={relationship} objectId={getArcgisObjectId(result.data.attributes)} showAllFields={result.data.showAllFields} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center py-12 px-6 text-center text-base-content/70">
          <p>No details available for this result.</p>
        </div>
      );
  }
}

type ResultWithMethods = Result & { loadDetails?: () => Promise<void>; clearParcelLayer?: () => void };

/** Runs a result's lazy `loadDetails` hook, if it has one. */
export async function loadResultDetails(result: Result): Promise<void> {
  try {
    await (result as ResultWithMethods).loadDetails?.();
  } catch (error) {
    console.error("Error loading result details:", error);
  }
}

/** Clears the parcel highlight for every result that provides a `clearParcelLayer` hook. */
export function clearResultParcelLayers(results: Result[]): void {
  results.forEach((result) => (result as ResultWithMethods).clearParcelLayer?.());
}

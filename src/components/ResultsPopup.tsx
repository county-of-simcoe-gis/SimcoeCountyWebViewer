"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Feature } from "ol";
import { FaHome, FaBuilding, FaLayerGroup } from "react-icons/fa";
import RecordSelectorPopup, { RecordItem } from "@/components/RecordSelectorPopup";
import PropertyPopup, { type PropertyInfo } from "@/components/PropertyPopup";
import { InfoRow } from "@/components/common/InfoRow";
import { isExcludedKey } from "@/utils/identifyHelpers";
import { resolveDomainName, resolveFieldAlias, type ArcgisLayerFieldMetadata } from "@/utils/arcgisFieldMetadata";
import { useFeatureHighlight } from "@/hooks/useFeatureHighlight";

// Base interface for common result fields
interface BaseResult extends RecordItem {
  id: string;
  displayName: string;
  /** Z-index of the source layer, used to sort results so top-most layers appear first */
  layerZIndex?: number;
  /**
   * ID of the LayerManager-managed layer that produced this result. Used by the
   * InteractionManager's post-aggregation filter to drop the property-report-click
   * result when a `suppressParcelClick` layer also returned a hit.
   */
  layerId?: string;
  /** Optional custom render function for the popup content area */
  renderContent?: () => ReactNode;
  /** Optional custom render function for the sidebar icon in collapsed mode */
  renderSidebarIcon?: () => ReactNode;
}

// Property result
export interface PropertyResult extends BaseResult {
  type: "property";
  data: {
    ARN: string;
    Address?: string;
    feature: Feature;
    propInfo: PropertyInfo;
  };
}

// Condo unit result
export interface CondoResult extends BaseResult {
  type: "condo";
  data: {
    ARN: string;
    UnitNumber?: string;
    Address?: string;
    feature: Feature;
    propInfo?: PropertyInfo;
  };
}

// Layer identification result
export interface IdentifyResult extends BaseResult {
  type: "identify" | "layer";
  data: {
    layerName: string;
    featureId: string;
    attributes: Record<string, unknown>;
    feature?: Feature;
    /** ArcGIS field aliases + coded-value domains for the layer, when available. */
    fieldMetadata?: ArcgisLayerFieldMetadata;
  };
}

// Discriminated union of all result types
export type Result = PropertyResult | CondoResult | IdentifyResult;

interface ResultsPopupProps {
  results: Result[];
  onClose: () => void;
  onClearParcelLayer?: () => void;
  isLoadingResults?: boolean;
  resultsError?: string | null;
  // Optional: Function to fetch additional details when a result is selected
  onSelectResult?: (result: Result) => Promise<void>;
}

export default function ResultsPopup({ results, onClose, onClearParcelLayer, isLoadingResults = false, resultsError = null, onSelectResult }: ResultsPopupProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const { highlightFeature, clearHighlight } = useFeatureHighlight();

  const handleHoverRecord = useCallback(
    (record: Result | null) => {
      if (!record) {
        clearHighlight();
        return;
      }
      const feature = record.data?.feature;
      if (feature) {
        highlightFeature(feature);
      }
    },
    [highlightFeature, clearHighlight],
  );

  // Auto-select first result when results change
  useEffect(() => {
    if (results.length > 0 && !isLoadingResults) {
      const firstResult = results[0];
      setSelectedRecordId(firstResult.id);

      // Also trigger lazy loading for the first result if needed
      if (onSelectResult) {
        onSelectResult(firstResult);
      }
    } else if (results.length === 0) {
      setSelectedRecordId(null);
    }
  }, [results, isLoadingResults, onSelectResult]);

  // Custom icon renderer for collapsed state
  const renderCollapsedIcon = (result: Result, index: number, isSelected: boolean) => {
    // Use custom sidebar icon if provided
    if (result.renderSidebarIcon) {
      return (
        <div className={`text-sm flex items-center justify-center leading-none ${isSelected ? "text-white" : "text-base-content/70"}`} data-testid="result-icon">
          {result.renderSidebarIcon()}
        </div>
      );
    }

    let IconComponent = FaLayerGroup;

    switch (result.type) {
      case "property":
        IconComponent = FaHome;
        break;
      case "condo":
        IconComponent = FaBuilding;
        break;
      case "identify":
      case "layer":
        IconComponent = FaLayerGroup;
        break;
    }

    return (
      <div className={`text-sm flex items-center justify-center leading-none ${isSelected ? "text-white" : "text-base-content/70"}`} data-testid="result-icon">
        <IconComponent />
      </div>
    );
  };

  const handleSelectRecord = async (id: string) => {
    setSelectedRecordId(id);

    if (onSelectResult) {
      setIsLoadingContent(true);
      try {
        const result = results.find((r) => r.id === id);
        if (result) {
          await onSelectResult(result);
        }
      } catch (error) {
        console.error("Error loading result details:", error);
      } finally {
        setIsLoadingContent(false);
      }
    }
  };

  // Render sidebar item based on result type
  const renderSidebarItem = (result: Result, isSelected: boolean) => {
    switch (result.type) {
      case "property":
        return (
          <div className="flex flex-col gap-[3px] w-full">
            <div className={`text-[10px] font-bold uppercase tracking-[0.5px] ${isSelected ? "text-white/90" : "text-primary"}`}>Property</div>
            <div className={`text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3] ${isSelected ? "text-white" : "text-base-content"}`}>
              {result.data.Address || result.displayName}
            </div>
            <div className={`text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis leading-[1.2] ${isSelected ? "text-white/80" : "text-base-content/70"}`}>{result.data.ARN}</div>
          </div>
        );

      case "condo":
        return (
          <div className="flex flex-col gap-[3px] w-full">
            <div className={`text-[10px] font-bold uppercase tracking-[0.5px] ${isSelected ? "text-white/90" : "text-primary"}`}>Condo Unit</div>
            <div className={`text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3] ${isSelected ? "text-white" : "text-base-content"}`}>{result.displayName}</div>
            {result.data.UnitNumber && (
              <div className={`text-[11px] font-medium whitespace-nowrap overflow-hidden text-ellipsis leading-[1.2] ${isSelected ? "text-white/90" : "text-primary"}`}>
                Unit: {result.data.UnitNumber}
              </div>
            )}
            <div className={`text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis leading-[1.2] ${isSelected ? "text-white/80" : "text-base-content/70"}`}>{result.data.ARN}</div>
          </div>
        );

      case "identify":
      case "layer":
        return (
          <div className="flex flex-col gap-[3px] w-full">
            <div className={`text-[10px] font-bold uppercase tracking-[0.5px] ${isSelected ? "text-white/90" : "text-primary"}`}>{result.data.layerName}</div>
            <div className={`text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3] ${isSelected ? "text-white" : "text-base-content"}`}>{result.displayName}</div>
          </div>
        );
    }
  };

  // Render content based on result type
  const renderContent = (result: Result | null) => {
    if (!result) return null;

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
              {Object.entries(result.data.attributes)
                .filter(([key, value]) => !isExcludedKey(key) && key !== "bbox" && typeof value !== "object")
                .map(([key, value]) => {
                  // ArcGIS layers: prefer the field alias for the label and
                  // the coded-value domain name for the value, when available.
                  const meta = result.data.fieldMetadata;
                  const alias = resolveFieldAlias(meta, key);
                  const domainName = resolveDomainName(meta, key, value);
                  return <InfoRow key={key} label={key} labelOverride={alias} value={domainName ?? (value != null ? String(value) : "")} />;
                })}
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
  };

  return (
    <RecordSelectorPopup
      records={results}
      selectedRecordId={selectedRecordId}
      onSelectRecord={handleSelectRecord}
      renderSidebarItem={renderSidebarItem}
      renderContent={renderContent}
      renderCollapsedIcon={renderCollapsedIcon}
      sidebarTitle="Results"
      isLoadingRecords={isLoadingResults}
      isLoadingContent={isLoadingContent}
      recordsError={resultsError}
      emptyMessage="No results found at this location."
      onHoverRecord={handleHoverRecord}
    />
  );
}

// Helper function to create a property result
export function createPropertyResult(arn: string, address: string, feature: Feature, propInfo: PropertyInfo): PropertyResult {
  return {
    id: `property_${arn}`,
    type: "property",
    displayName: address || arn,
    layerZIndex: -1, // Property results sort to bottom
    data: {
      ARN: arn,
      Address: address,
      feature,
      propInfo,
    },
  };
}

// Helper function to create a condo result
export function createCondoResult(arn: string, unitNumber: string | undefined, address: string | undefined, feature: Feature, propInfo?: PropertyInfo): CondoResult {
  const displayName = unitNumber ? `Unit ${unitNumber} - ${address || ""}` : address || arn;

  return {
    id: `condo_${arn}`,
    type: "condo",
    displayName,
    layerZIndex: -1, // Condo results sort to bottom
    data: {
      ARN: arn,
      UnitNumber: unitNumber,
      Address: address,
      feature,
      propInfo,
    },
  };
}

// Helper function to create an identify result
export function createIdentifyResult(
  layerName: string,
  featureId: string,
  attributes: Record<string, unknown>,
  feature?: Feature,
  layerZIndex?: number,
  options?: { layerId?: string; displayName?: string; fieldMetadata?: ArcgisLayerFieldMetadata },
): IdentifyResult {
  // Try to create a meaningful display name from attributes, with caller override for
  // layers that expose a configured display field such as Name or Address.
  const displayName = String(options?.displayName || attributes.name || attributes.Name || attributes.NAME || attributes.address || attributes.Address || attributes.label || layerName);

  return {
    id: `identify_${layerName}_${featureId}`,
    type: "identify",
    displayName,
    layerZIndex,
    layerId: options?.layerId,
    data: {
      layerName,
      featureId,
      attributes,
      feature,
      fieldMetadata: options?.fieldMetadata,
    },
  };
}

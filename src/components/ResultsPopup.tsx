"use client";

import { useState, useEffect } from "react";
import { Feature } from "ol";
import { FaHome, FaBuilding, FaLayerGroup } from "react-icons/fa";
import RecordSelectorPopup, { RecordItem } from "@/components/RecordSelectorPopup";
import PropertyPopup from "@/components/PropertyPopup";
import "@/components/ResultsPopup.css";

// Base interface for all result types
export interface Result extends RecordItem {
  id: string;
  type: "property" | "condo" | "identify" | "layer";
  displayName: string;
  data: any;
  /** Z-index of the source layer, used to sort results so top-most layers appear first */
  layerZIndex?: number;
}

// Property result
export interface PropertyResult extends Result {
  type: "property";
  data: {
    ARN: string;
    Address?: string;
    feature: Feature;
    propInfo: any;
  };
}

// Condo unit result
export interface CondoResult extends Result {
  type: "condo";
  data: {
    ARN: string;
    UnitNumber?: string;
    Address?: string;
    feature: Feature;
    propInfo?: any;
  };
}

// Layer identification result
export interface IdentifyResult extends Result {
  type: "identify" | "layer";
  data: {
    layerName: string;
    featureId: string;
    attributes: Record<string, any>;
    feature?: Feature;
  };
}

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
      <div className={`sc-result-icon ${isSelected ? "sc-result-icon-selected" : ""}`}>
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
    const baseClasses = isSelected ? "selected" : "";

    switch (result.type) {
      case "property":
        return (
          <div className="sc-result-details">
            <div className={`sc-result-type ${baseClasses}`}>Property</div>
            <div className={`sc-result-text ${baseClasses}`}>{result.data.Address || result.displayName}</div>
            <div className={`sc-result-id ${baseClasses}`}>{result.data.ARN}</div>
          </div>
        );

      case "condo":
        return (
          <div className="sc-result-details">
            <div className={`sc-result-type ${baseClasses}`}>Condo Unit</div>
            <div className={`sc-result-text ${baseClasses}`}>{result.displayName}</div>
            {result.data.UnitNumber && <div className={`sc-result-unit ${baseClasses}`}>Unit: {result.data.UnitNumber}</div>}
            <div className={`sc-result-id ${baseClasses}`}>{result.data.ARN}</div>
          </div>
        );

      case "identify":
      case "layer":
        return (
          <div className="sc-result-details">
            <div className={`sc-result-type ${baseClasses}`}>{result.data.layerName}</div>
            <div className={`sc-result-text ${baseClasses}`}>{result.displayName}</div>
            <div className={`sc-result-id ${baseClasses}`}>{result.data.featureId}</div>
          </div>
        );

      default:
        return (
          <div className="sc-result-details">
            <div className={`sc-result-text ${baseClasses}`}>{result.displayName}</div>
          </div>
        );
    }
  };

  // Render content based on result type
  const renderContent = (result: Result | null) => {
    if (!result) return null;

    // Check for custom render function first
    if (result.data?.renderContent && typeof result.data.renderContent === "function") {
      return result.data.renderContent();
    }

    switch (result.type) {
      case "property":
      case "condo":
        if (result.data.propInfo && result.data.feature) {
          return <PropertyPopup propInfo={result.data.propInfo} feature={result.data.feature} onClose={onClose} onClearParcelLayer={onClearParcelLayer} />;
        }
        return (
          <div className="sc-result-content-loading">
            <p>Loading property details...</p>
          </div>
        );

      case "identify":
      case "layer":
        return (
          <div className="sc-result-identify-content">
            <h3>{result.data.layerName}</h3>
            <p className="sc-result-feature-id">Feature ID: {result.data.featureId}</p>
            <div className="sc-result-attributes">
              <h4>Attributes</h4>
              <table className="sc-result-attributes-table">
                <tbody>
                  {Object.entries(result.data.attributes).map(([key, value]) => (
                    <tr key={key}>
                      <td className="sc-result-attr-key">{key}</td>
                      <td className="sc-result-attr-value">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="sc-result-content-empty">
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
    />
  );
}

// Helper function to create a property result
export function createPropertyResult(arn: string, address: string, feature: Feature, propInfo: any): PropertyResult {
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
export function createCondoResult(arn: string, unitNumber: string | undefined, address: string | undefined, feature: Feature, propInfo?: any): CondoResult {
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
export function createIdentifyResult(layerName: string, featureId: string, attributes: Record<string, any>, feature?: Feature, layerZIndex?: number): IdentifyResult {
  // Try to create a meaningful display name from attributes
  const displayName = attributes.name || attributes.NAME || attributes.label || featureId;

  return {
    id: `identify_${layerName}_${featureId}`,
    type: "identify",
    displayName,
    layerZIndex,
    data: {
      layerName,
      featureId,
      attributes,
      feature,
    },
  };
}

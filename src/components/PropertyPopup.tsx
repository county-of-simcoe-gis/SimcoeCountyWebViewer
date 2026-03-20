"use client";

import { useState } from "react";
import { Feature } from "ol";
import { useAppStore } from "@/stores/appStore";
import { InfoWindowRow } from "@/components/ui/InfoWindowRow";
import { usePropertyPopupExtensionStore } from "@/stores/propertyPopupExtensionStore";
import { usePopupStore } from "@/stores/popupStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useEventStore } from "@/stores/eventStore";
import { useToastStore } from "@/hooks/useToast";
import PropertyReport from "@/components/PropertyReport";
import IdentifyQuery from "@/components/Identify/IdentifyQuery";
import { activateTab } from "@/utils/helpersUI";

export interface PropertyInfo {
  ARN: string;
  Address?: string;
  AssessedValue?: string; // Base64 encoded PNG image (data:image/png;base64,...)
  HasZoning?: boolean;
  WasteCollection?: {
    GarbageDay?: string;
  };
  Other?: {
    BroadbandSpeed?: string;
  };
  pointCoordinates?: number[];
  pointerCoordinates?: number[];
  shareURL?: string;
  area?: number;
  [key: string]: unknown;
}

interface PropertyPopupProps {
  propInfo: PropertyInfo;
  feature: Feature;
  onClose?: () => void;
  onClearParcelLayer?: () => void;
}

export default function PropertyPopup({ propInfo, feature, onClose, onClearParcelLayer }: PropertyPopupProps) {
  const config = useAppStore((state) => state.config);
  const [copied, setCopied] = useState(false);
  const extensionItems = usePropertyPopupExtensionStore((s) => s.getVisibleItems)();

  const { ARN: arn, Address: address, AssessedValue: assessedValue, HasZoning: hasZoning, WasteCollection: wasteCollection, Other: other, pointCoordinates, shareURL } = propInfo;
  const garbageDay = wasteCollection?.GarbageDay;
  const broadbandSpeed = other?.BroadbandSpeed;

  const handleCopyARN = () => {
    navigator.clipboard.writeText(arn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (shareURL) {
      navigator.clipboard.writeText(shareURL);
      alert("Link copied to clipboard!");
    }
  };

  const handleAddToMyMaps = () => {
    const label = address || `Property ${arn}`;
    useEventStore.getState().emitAddMyMapsFeature(feature, label);
    activateTab("mymaps");
    useToastStore.getState().addToast("Feature added to MyMaps", "success");
  };

  const handleMoreInfo = () => {
    // Close the popup overlay and parcel highlight
    onClearParcelLayer?.();
    onClose?.();
    usePopupStore.getState().hide();

    // Load the detailed property report into the Reports tab
    useReportsStore.getState().setReport({
      id: `property-report-${arn}-${Date.now()}`,
      title: address ? `Property: ${address}` : `Property: ${arn}`,
      content: (
        <PropertyReport
          arn={arn}
          onZoomClick={
            feature
              ? () => {
                  const map = (window as unknown as { map?: { getView: () => { fit: (extent: unknown, size: unknown) => void } }; getSize: () => unknown }).map;
                  const geom = feature.getGeometry();
                  if (map && geom) {
                    map.getView().fit(geom.getExtent(), map.getSize());
                  }
                }
              : undefined
          }
        />
      ),
      createdAt: new Date(),
      source: "propertyReport",
    });
    activateTab("reports");
  };

  const handleCloseClick = () => {
    // Call the parent-provided callbacks first (parcel layer cleanup, etc.)
    onClearParcelLayer?.();
    onClose?.();

    // Also close via the store directly — this ensures the popup closes
    // even when rendered inside the Reports tab (where onClose may not
    // be wired to popupStore.hide).
    usePopupStore.getState().hide();

    // If we are rendering inside the Reports tab, clear the current report
    // (keeps session history intact so Back still works).
    if (useReportsStore.getState().currentReport) {
      useReportsStore.getState().clearReport();
    }
  };

  const handleCustomIdentify = (item: NonNullable<NonNullable<typeof config>["propertyReport"]>["customIdentify"] extends Array<infer T> ? T : never) => {
    if (!item) return;
    const whereClause = item.whereFormat.replace("{arn}", arn);

    // Close popup and parcel layer
    onClearParcelLayer?.();
    onClose?.();
    usePopupStore.getState().hide();

    // Load the ArcGIS query report into the Reports tab
    useReportsStore.getState().setReport({
      id: `custom-identify-${arn}-${Date.now()}`,
      title: item.title || item.label,
      content: (
        <IdentifyQuery title={item.title || item.label} layerURL={item.layerURL} layerId={item.layerId} where={whereClause} fields={item.fields || ["*"]} secured={item.secured} type={item.type} />
      ),
      createdAt: new Date(),
      source: "customIdentify",
    });
    activateTab("reports");
  };

  return (
    <div className="bg-white">
      <div className="relative overflow-x-hidden overflow-y-auto">
        {/* Address */}
        {address && <InfoWindowRow label="Address" value={address} />}

        {/* Roll Number (ARN) with copy button */}
        {arn && (
          <InfoWindowRow label="Roll Number">
            {arn}
            <button
              className="bg-transparent border-none cursor-pointer ml-1.5 -mb-0.5 p-0 text-xs transition-transform hover:scale-125"
              onClick={handleCopyARN}
              title="Copy to Clipboard"
              aria-label="Copy ARN to clipboard"
            >
              📋
            </button>
            {copied && <span className="text-green-500 text-[10px] ml-1.5 animate-[fadeOut_2s_forwards]">Copied!</span>}
          </InfoWindowRow>
        )}

        {/* Has Zoning */}
        {hasZoning !== undefined && <InfoWindowRow label="Has Zoning" value={hasZoning ? "Yes" : "No"} />}

        {/* Assessed Value - rendered as image matching legacy */}
        {assessedValue && (
          <InfoWindowRow label="Assessed Value">
            {}
            <img src={assessedValue} alt="Assessed Value" className="mb-0.5" style={{ height: "16px", minWidth: "300px" }} />
            <div className="text-[9px] text-gray-600 pb-1">(may not reflect current market value)</div>
          </InfoWindowRow>
        )}

        {/* Garbage Day */}
        {garbageDay && <InfoWindowRow label="Waste Collection Day" value={garbageDay} />}

        {/* Broadband Speed */}
        {broadbandSpeed && <InfoWindowRow label="Potential Broadband Coverage" value={broadbandSpeed} />}

        {/* Extension items (e.g. MPac/Teranet report links, owner names) */}
        {arn &&
          extensionItems.map((ext) => (
            <InfoWindowRow key={ext.id} label={ext.label}>
              {ext.render(arn)}
            </InfoWindowRow>
          ))}

        {/* Custom Identify items from propertyReport config */}
        {arn &&
          config?.propertyReport?.customIdentify?.map((item, idx) => (
            <InfoWindowRow key={`custom-identify-${idx}`} label={item.label}>
              <span className="text-[#337ab7] underline cursor-pointer select-none hover:text-[#23527c]" onClick={() => handleCustomIdentify(item)}>
                {item.linkText}
              </span>
            </InfoWindowRow>
          ))}

        {/* Tools */}
        <InfoWindowRow label="Tools">
          <div className="inline">
            <span className="text-[#337ab7] underline cursor-pointer select-none mr-1 hover:text-[#23527c]" onClick={handleAddToMyMaps}>
              [Add to My Maps]
            </span>
            <span className="text-[#337ab7] underline cursor-pointer select-none mr-1 hover:text-[#23527c]" onClick={handleShare}>
              [Share]
            </span>
            <span
              className="text-[#337ab7] underline cursor-pointer select-none mr-1 hover:text-[#23527c]"
              onClick={() => {
                const termsUrl = config?.termsUrl as string | undefined;
                if (termsUrl) {
                  window.open(termsUrl, "_blank");
                }
              }}
            >
              [Terms]
            </span>
          </div>
        </InfoWindowRow>

        {/* Coordinates */}
        {pointCoordinates && <InfoWindowRow label="Pointer Coordinates" value={`Lat: ${Math.round(pointCoordinates[1] * 10000) / 10000}  Long: ${Math.round(pointCoordinates[0] * 10000) / 10000}`} />}
      </div>

      {/* Action Buttons — sticky so the scroll container can't shift them away from the cursor */}
      <div className="flex mt-1.5 w-full sticky bottom-0 bg-white pt-1 pb-0.5 z-10">
        <button
          className="btn btn-sm flex-[6] mr-1.5 min-h-8 rounded-sm border-gray-300 bg-gradient-to-b from-white to-gray-200 text-[#2d343c] text-xs font-normal shadow-none hover:border-[#80b9ff] hover:shadow-[0_0_5px_#80b9ff]"
          onClick={handleMoreInfo}
        >
          More Information
        </button>
        <button
          className="btn btn-sm flex-[4] min-h-8 rounded-sm border-gray-300 bg-gradient-to-b from-white to-gray-200 text-[#2d343c] text-xs font-normal shadow-none hover:border-[#80b9ff] hover:shadow-[0_0_5px_#80b9ff]"
          onClick={handleCloseClick}
        >
          Close
        </button>
      </div>
    </div>
  );
}

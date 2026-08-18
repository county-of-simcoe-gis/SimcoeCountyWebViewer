"use client";

import { useState } from "react";
import Image from "next/image";
import { Feature } from "ol";
import { Style } from "ol/style";
import { useAppStore } from "@/stores/appStore";
import { InfoWindowRow } from "@/components/ui/InfoWindowRow";
import { usePropertyPopupExtensionStore } from "@/stores/propertyPopupExtensionStore";
import { isPropertyInMunicipality } from "@/utils/municipalityFilter";
import { usePopupStore } from "@/stores/popupStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import { bufferGeometry } from "@/utils/openlayers/BufferHelpers";
import { useToastStore } from "@/hooks/useToast";
import { useToast } from "@/hooks/useToast";
import PropertyReport from "@/components/PropertyReport";
import IdentifyQuery from "@/components/Identify/IdentifyQuery";
import Identify from "@/components/Identify";
import Zoning from "@/components/themes/Zoning/Zoning";
import { activateTab } from "@/utils/helpersUI";

export interface PropertyInfo {
  ARN: string;
  Address?: string;
  Municipality?: string;
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
  const toast = useToast();
  const extensionItems = usePropertyPopupExtensionStore((s) => s.getVisibleItems)();
  const showSecuredExtensions = isPropertyInMunicipality(propInfo.Municipality);

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
      toast.success("Link copied to clipboard!");
    }
  };

  const handleAddToMyMaps = () => {
    const label = address || `Property ${arn}`;
    // Create a MyMaps item from the feature and add it directly to the store
    const featureStyle = feature.getStyle();
    const myMapsItem = createMyMapsItem(feature, "Buffer", label, featureStyle instanceof Style ? styleToJSON(featureStyle) : undefined);
    myMapsItem.featureGeoJSON = featureToGeoJSON(feature);
    useMyMapsStore.getState().addItem(myMapsItem);
    useEventStore.getState().emit("mymap-item-created", { item: myMapsItem });
    activateTab("mymaps");
    useToastStore.getState().addToast("Feature added to MyMaps", "success");
  };

  const handleViewZoning = () => {
    // Close popup and parcel layer
    onClearParcelLayer?.();
    onClose?.();
    usePopupStore.getState().hide();

    // Load Zoning directly into the Reports tab with the ARN.
    // This works even when the Zoning theme is disabled in the sidebar.
    useReportsStore.getState().setReport({
      id: `zoning-${arn}-${Date.now()}`,
      title: `Zoning: ${arn}`,
      content: <Zoning initialArn={arn} hideHeader onClose={() => useReportsStore.getState().clearReport()} />,
      createdAt: new Date(),
      source: "zoning",
    });
    activateTab("reports");
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
                  const map = (window as unknown as { map?: { getView: () => { fit: (extent: unknown, size: unknown) => void }; getSize: () => unknown } }).map;
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

  const handleCustomIdentify = (item: NonNullable<NonNullable<NonNullable<typeof config>["propertyReport"]>["customIdentify"]>[number]) => {
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

  const handleIdentifyAdjacent = async () => {
    const geom = feature?.getGeometry();
    if (!geom) return;

    // Close popup and parcel layer
    onClearParcelLayer?.();
    onClose?.();
    usePopupStore.getState().hide();

    // Buffer the parcel geometry by 1 meter so adjacent features are included
    bufferGeometry(geom, 1, (bufferedGeom) => {
      // Load the Identify component with the buffered geometry into the Reports tab
      useReportsStore.getState().setReport({
        id: `identify-adjacent-${arn}-${Date.now()}`,
        title: "Identify Adjacent Features",
        content: <Identify geometry={bufferedGeom} />,
        createdAt: new Date(),
        source: "identifyAdjacent",
      });
      activateTab("reports");
    });
  };

  return (
    <div className="bg-base-100">
      <div className="relative overflow-x-hidden overflow-y-auto">
        {/* Address */}
        {address && <InfoWindowRow label="Address" value={address} />}

        {/* Roll Number (ARN) with copy button and investigate button */}
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
        {hasZoning !== undefined && (
          <InfoWindowRow label="Has Zoning">
            {hasZoning ? "Yes" : "No"}
            {hasZoning && (
              <Image src="/images/information.png" alt="View Zoning" title="View Zoning" width={16} height={16} className="inline-block -mb-0.5 ml-1.5 cursor-pointer" onClick={handleViewZoning} />
            )}
          </InfoWindowRow>
        )}

        {/* Assessed Value - rendered as image matching legacy */}
        {assessedValue && (
          <InfoWindowRow label="Assessed Value">
            {}
            <img src={assessedValue} alt="Assessed Value" className="mb-0.5" style={{ height: "16px", minWidth: "300px" }} />
            <div className="text-[9px] text-base-content/60 pb-1">(may not reflect current market value)</div>
          </InfoWindowRow>
        )}

        {/* Garbage Day */}
        {garbageDay && <InfoWindowRow label="Waste Collection Day" value={garbageDay} />}

        {/* Broadband Speed */}
        {broadbandSpeed && <InfoWindowRow label="Potential Broadband Coverage" value={broadbandSpeed} />}

        {/* Extension items (e.g. MPac/Teranet report links, owner names) — hidden when municipality filter active and property is outside */}
        {arn &&
          showSecuredExtensions &&
          extensionItems.map((ext) => (
            <InfoWindowRow key={ext.id} label={ext.label}>
              {ext.render(arn)}
            </InfoWindowRow>
          ))}

        {/* Identify adjacent features */}
        {feature?.getGeometry() && (
          <InfoWindowRow label="Identify">
            <span className="text-primary underline cursor-pointer select-none hover:text-primary/80" onClick={handleIdentifyAdjacent}>
              Identify adjacent features
            </span>
          </InfoWindowRow>
        )}

        {/* Custom Identify items from propertyReport config */}
        {arn &&
          config?.propertyReport?.customIdentify
            ?.filter((item) => !item.secured || showSecuredExtensions)
            .map((item, idx) => (
              <InfoWindowRow key={`custom-identify-${idx}`} label={item.label}>
                <span className="text-primary underline cursor-pointer select-none hover:text-primary/80" onClick={() => handleCustomIdentify(item)}>
                  {item.linkText}
                </span>
              </InfoWindowRow>
            ))}

        {/* Tools */}
        <InfoWindowRow label="Tools">
          <div className="inline">
            <span className="text-primary underline cursor-pointer select-none mr-1 hover:text-primary/80" onClick={handleAddToMyMaps}>
              [Add to My Maps]
            </span>
            <span className="text-primary underline cursor-pointer select-none mr-1 hover:text-primary/80" onClick={handleShare}>
              [Share]
            </span>
            <span
              className="text-primary underline cursor-pointer select-none mr-1 hover:text-primary/80"
              onClick={() => {
                const termsUrl = config?.termsUrl as string | undefined;
                if (termsUrl) {
                  import("@/utils/helpersUI").then(({ showURLWindow }) => {
                    showURLWindow(termsUrl, false, "normal", false, false, "Terms and Conditions");
                  });
                }
              }}
            >
              [Terms]
            </span>
          </div>
        </InfoWindowRow>

        {/* Parcel Area */}
        {propInfo.area != null && !isNaN(propInfo.area) && propInfo.area > 0 && <InfoWindowRow label="Parcel Area" value={`${(propInfo.area / 10000).toFixed(3)} hectares`} />}

        {/* Coordinates */}
        {pointCoordinates && <InfoWindowRow label="Pointer Coordinates" value={`Lat: ${Math.round(pointCoordinates[1] * 10000) / 10000}  Long: ${Math.round(pointCoordinates[0] * 10000) / 10000}`} />}
      </div>

      {/* Action Buttons — sticky so the scroll container can't shift them away from the cursor */}
      <div className="flex mt-1.5 w-full sticky bottom-0 bg-base-100 pt-1 pb-0.5 z-10">
        <button
          className="btn btn-sm flex-[6] mr-1.5 min-h-8 rounded-sm border-base-300 bg-gradient-to-b from-base-100 to-base-300 text-base-content text-xs font-normal shadow-none hover:border-[#80b9ff] hover:shadow-[0_0_5px_#80b9ff]"
          onClick={handleMoreInfo}
        >
          More Information
        </button>
        <button
          className="btn btn-sm flex-[4] min-h-8 rounded-sm border-base-300 bg-gradient-to-b from-base-100 to-base-300 text-base-content text-xs font-normal shadow-none hover:border-[#80b9ff] hover:shadow-[0_0_5px_#80b9ff]"
          onClick={handleCloseClick}
        >
          Close
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { InfoWindowRow } from "@/components/ui/InfoWindowRow";
import { showURLWindow } from "@/utils/helpersUI";
import AppImage from "@/components/shared/AppImage";
import { apiUrl as toApiUrl } from "@/lib/axiosInstance";

/** Shape returned by /api/public/reports/property/[arn] */
interface PropertyReportData {
  ARN: string;
  PropertyType?: string;
  Address: string;
  AssessedValue?: string; // base64 PNG
  ReportURL?: string;
  HasZoning?: boolean;
  EmergencyService?: {
    PoliceStation?: string;
    FireStation?: string;
  };
  WasteCollection?: {
    GarbageDay?: string;
    LandfillLocation_General?: string;
    LandfillLocation_Hazardous?: string;
    BagTagleLocation1?: string;
    BagTagleLocation2?: string;
    BagTagleLocation3?: string;
    WasteURL?: string;
  };
  Schools?: {
    CatholicElementry?: string;
    CatholicSecondary?: string;
    CatholicBoardWebsiteURL?: string;
    PublicElementry?: string;
    PublicSecondary?: string;
    PublicLookup?: string;
    PublicBoardWebsiteURL?: string;
  };
  Other?: {
    Library?: string;
    LibraryUrl?: string;
    ClosestFireHydrant?: string;
    MunicipalAdminCentre?: string;
    MunicipalAdminCentreUrl?: string;
    ClosestHospital?: string;
    ClosestHospitalUrl?: string;
    BroadbandSpeed?: string;
  };
}

interface PropertyReportProps {
  arn: string;
  /** Optional callback to zoom to the parcel feature on the map. */
  onZoomClick?: () => void;
}

export default function PropertyReport({ arn, onZoomClick }: PropertyReportProps) {
  const config = useAppStore((state) => state.config);
  const [data, setData] = useState<PropertyReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const rawUrl = `${config?.propertyReportUrl ?? "/api/public/reports/property/"}${arn}`;
        const url = rawUrl.startsWith("/api/") ? toApiUrl(rawUrl) : rawUrl;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Property not found." : `Server error (${res.status})`);
        }
        const json = (await res.json()) as PropertyReportData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arn]);

  /** Print Preview — posts to the embed API and opens the report viewer. */
  const handlePrintPreview = async () => {
    if (!data) return;

    try {
      const reportName = "Public_Embedded";
      const reportUrl = ((config as Record<string, unknown>)?.reportUrl as string) ?? "https://opengis.simcoe.ca/reports/";

      const res = await fetch(toApiUrl(`/api/public/reports/embed/${reportName}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: [{ name: "ARN", value: data.ARN, type: "text" }] }),
      });
      // Strip quotes from the key if present (API may return quoted string)
      const rawKey = await res.text();
      const key = rawKey.replace(/^"|"$/g, "");
      const previewUrl = `${reportUrl}?REPORT=${reportName}&KEY=${key}`;
      showURLWindow(previewUrl, false, "full", false, false, "Property Report");
    } catch (err) {
      console.error("Print preview error:", err);
    }
  };

  /* Loading / error states */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="loading loading-spinner loading-md" />
        <span className="ml-2 text-sm text-gray-500">Loading property report…</span>
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-4 text-red-600 text-sm">{error ?? "No data available."}</div>;
  }

  const isBarrie = data.ARN.substring(0, 4) === "4342";

  return (
    <div>
      {/* Action buttons */}
      <div className="flex gap-1.5 p-1.5">
        {onZoomClick && (
          <button
            className="flex-1 text-white text-xs py-1.5 px-3 rounded cursor-pointer border border-[#fb870e]"
            style={{ background: "linear-gradient(to bottom, #ffc578 0%, #fb9d23 100%)" }}
            onClick={onZoomClick}
          >
            Zoom
          </button>
        )}
        <button
          className="flex-1 text-white text-xs py-1.5 px-3 rounded cursor-pointer border border-[#3d7b9e]"
          style={{ background: "linear-gradient(to bottom, #3980cc 0%, #2865a2 100%)" }}
          onClick={handlePrintPreview}
        >
          Print Preview
        </button>
      </div>

      <div className="px-2.5 pt-1.5">
        {/* GENERAL INFO */}
        <ReportSection title="General Information" icon="/images/information.png">
          <InfoWindowRow label="Roll Number" value={data.ARN} />
          {!isBarrie && data.PropertyType && <InfoWindowRow label="Property Type" value={data.PropertyType} />}
          <InfoWindowRow label="Address" value={data.Address} />
          {!isBarrie && (
            <>
              <InfoWindowRow label="Assessed Value" value={data.AssessedValue ? <img src={data.AssessedValue} alt="Assessed Value" className="h-[18px] w-auto inline-block" /> : ""} />
              <div className="text-[9px] text-gray-500 pb-1 pl-4">(may not reflect current market value)</div>
            </>
          )}
        </ReportSection>

        {/* EMERGENCY SERVICE */}
        <ReportSection title="Emergency Service" icon="/images/information.png">
          <InfoWindowRow label="Police Station" value={data.EmergencyService?.PoliceStation ?? ""} />
          <InfoWindowRow label="Closest Firehall" value={data.EmergencyService?.FireStation ?? ""} />
        </ReportSection>

        {/* WASTE COLLECTION */}
        <ReportSection title="Waste Collection" icon="/images/information.png">
          <InfoWindowRow label="Garbage/Recycling Collection Day" value={data.WasteCollection?.GarbageDay ?? ""} />
          <InfoWindowRow
            label="Bag Tag Locations"
            value={<span>{[data.WasteCollection?.BagTagleLocation1, data.WasteCollection?.BagTagleLocation2, data.WasteCollection?.BagTagleLocation3].filter(Boolean).join(", ")}</span>}
          />
          <InfoWindowRow
            label="Waste Management Facility"
            value={
              <div>
                <div>
                  <span className="font-semibold text-[11px]">General Waste:</span> <span>{data.WasteCollection?.LandfillLocation_General ?? ""}</span>
                </div>
                <div>
                  <span className="font-semibold text-[11px]">Hazardous Waste:</span> <span>{data.WasteCollection?.LandfillLocation_Hazardous ?? ""}</span>
                </div>
              </div>
            }
          />
        </ReportSection>

        {/* SCHOOLS */}
        <ReportSection title="Schools" icon="/images/information.png">
          <InfoWindowRow label="Catholic Elementary" value={data.Schools?.CatholicElementry ?? ""} />
          <InfoWindowRow label="Catholic Secondary" value={data.Schools?.CatholicSecondary ?? ""} />
          <InfoWindowRow
            label="Catholic School Board Website"
            value={
              data.Schools?.CatholicBoardWebsiteURL ? (
                <a href={data.Schools.CatholicBoardWebsiteURL} target="_blank" rel="noopener noreferrer" className="text-[#337ab7] underline hover:text-[#23527c]">
                  {data.Schools.CatholicBoardWebsiteURL}
                </a>
              ) : (
                ""
              )
            }
          />
          {data.Schools?.PublicElementry && <InfoWindowRow label="Public Elementary" value={data.Schools.PublicElementry} />}
          {data.Schools?.PublicSecondary && <InfoWindowRow label="Public Secondary" value={data.Schools.PublicSecondary} />}
          {data.Schools?.PublicLookup && (
            <InfoWindowRow
              label="Public School Lookup"
              value={
                <a href={data.Schools.PublicLookup} target="_blank" rel="noopener noreferrer" className="text-[#337ab7] underline hover:text-[#23527c]">
                  School Lookup
                </a>
              }
            />
          )}
          <InfoWindowRow
            label="Public School Board Website"
            value={
              data.Schools?.PublicBoardWebsiteURL ? (
                <a href={data.Schools.PublicBoardWebsiteURL} target="_blank" rel="noopener noreferrer" className="text-[#337ab7] underline hover:text-[#23527c]">
                  {data.Schools.PublicBoardWebsiteURL}
                </a>
              ) : (
                ""
              )
            }
          />
        </ReportSection>

        {/* OTHER */}
        <ReportSection title="Other" icon="/images/information.png">
          <InfoWindowRow label="Library" value={data.Other?.Library ?? ""} />
          <InfoWindowRow label="Closest Fire Hydrant" value={data.Other?.ClosestFireHydrant ?? ""} />
          <InfoWindowRow label="Municipal Admin Centre" value={data.Other?.MunicipalAdminCentre ?? ""} />
          <InfoWindowRow label="Closest Hospital" value={data.Other?.ClosestHospital ?? ""} />
          <InfoWindowRow label="Potential Broadband Coverage" value={data.Other?.BroadbandSpeed ?? ""} />
        </ReportSection>
      </div>
    </div>
  );
}

/** Collapsible section heading with icon, matching the legacy report layout */
function ReportSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase bg-[#dfdfdf] p-1.5 border border-[#ccc] rounded-t">
        {}
        <AppImage src={icon} alt="" className="w-5 h-5" />
        {title}
      </div>
      <div className="border-x border-b border-[#ccc] mb-2.5 p-1.5 rounded-b">{children}</div>
    </>
  );
}

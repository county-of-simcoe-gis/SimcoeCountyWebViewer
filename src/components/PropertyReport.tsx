"use client";

import { useEffect, useState } from "react";
import "./PropertyReport.css";
import config from "@/config.json";

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
  const [data, setData] = useState<PropertyReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${(config as { propertyReportUrl?: string }).propertyReportUrl ?? "/api/public/reports/property/"}${arn}`;
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
  }, [arn]);

  /** Print Preview — posts to the legacy embed API and opens the report viewer. */
  const handlePrintPreview = async () => {
    if (!data) return;

    try {
      const reportName = "Public_Embedded";
      const apiUrl = (config as { apiUrl?: string }).apiUrl ?? "https://opengis.simcoe.ca/api_v2/";
      const reportUrl = (config as { reportUrl?: string }).reportUrl ?? "https://opengis.simcoe.ca/reports/";

      const res = await fetch(`${apiUrl}public/reports/embed/${reportName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: [{ name: "ARN", value: data.ARN, type: "text" }] }),
      });
      const key = await res.text();
      window.open(`${reportUrl}?REPORT=${reportName}&KEY=${key}`, "_blank", "noopener,noreferrer");
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
    <div className="sc-property-report-container">
      {/* Action buttons */}
      <div className="sc-property-report-html-title-button-container" style={{ display: "flex", gap: "5px", padding: "6px" }}>
        {onZoomClick && (
          <button className="sc-button sc-button-orange" style={{ flex: 1 }} onClick={onZoomClick}>
            Zoom
          </button>
        )}
        <button className="sc-button sc-button-blue" style={{ flex: 1 }} onClick={handlePrintPreview}>
          Print Preview
        </button>
      </div>

      <div className="sc-property-report-info-container">
        {/* GENERAL INFO */}
        <div className="sc-property-report-html-heading icon general">General Information</div>
        <div className="sc-property-report-html-container">
          <div>
            <div className="sc-property-report-html-label">Roll Number: </div>
            <div className="sc-property-report-html-value">{data.ARN}</div>
          </div>
          {!isBarrie && data.PropertyType && (
            <div>
              <div className="sc-property-report-html-label">Property Type: </div>
              <div className="sc-property-report-html-value">{data.PropertyType}</div>
            </div>
          )}
          <div>
            <div className="sc-property-report-html-label">Address: </div>
            <div className="sc-property-report-html-value">{data.Address}</div>
          </div>
          {!isBarrie && (
            <div>
              <div className="sc-property-report-html-label">Assessed Value: </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="sc-property-report-html-value">{data.AssessedValue ? <img src={data.AssessedValue} alt="Assessed Value" /> : ""}</div>
              <div className="sc-property-report-html-market">(may not reflect current market value)</div>
            </div>
          )}
        </div>

        {/* EMERGENCY SERVICE */}
        <div className="sc-property-report-html-heading icon general">Emergency Service</div>
        <div className="sc-property-report-html-container">
          <div>
            <div className="sc-property-report-html-label">Police Station: </div>
            <div className="sc-property-report-html-value">{data.EmergencyService?.PoliceStation ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Closest Firehall: </div>
            <div className="sc-property-report-html-value">{data.EmergencyService?.FireStation ?? ""}</div>
          </div>
        </div>

        {/* WASTE COLLECTION */}
        <div className="sc-property-report-html-heading icon general">Waste Collection</div>
        <div className="sc-property-report-html-container">
          <div>
            <div className="sc-property-report-html-label">Garbage/Recycling Collection Day: </div>
            <div className="sc-property-report-html-value">{data.WasteCollection?.GarbageDay ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Bag Tag Locations: </div>
            <div className="sc-property-report-html-value">{data.WasteCollection?.BagTagleLocation1 ?? ""}</div>
            <div className="sc-property-report-html-value">{data.WasteCollection?.BagTagleLocation2 ?? ""}</div>
            <div className="sc-property-report-html-value">{data.WasteCollection?.BagTagleLocation3 ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Waste Management Facility: </div>
            <div className="sc-property-report-html-value">General Waste</div>
            <div className="sc-property-report-html-value sub">{data.WasteCollection?.LandfillLocation_General ?? ""}</div>
            <div className="sc-property-report-html-value">Hazardous Waste</div>
            <div className="sc-property-report-html-value sub">{data.WasteCollection?.LandfillLocation_Hazardous ?? ""}</div>
          </div>
        </div>

        {/* SCHOOLS */}
        <div className="sc-property-report-html-heading icon general">Schools</div>
        <div className="sc-property-report-html-container">
          <div>
            <div className="sc-property-report-html-label">Catholic Elementary: </div>
            <div className="sc-property-report-html-value">{data.Schools?.CatholicElementry ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Catholic Secondary: </div>
            <div className="sc-property-report-html-value">{data.Schools?.CatholicSecondary ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Catholic School Board Website: </div>
            <div className="sc-property-report-html-value">
              {data.Schools?.CatholicBoardWebsiteURL && (
                <a href={data.Schools.CatholicBoardWebsiteURL} target="_blank" rel="noopener noreferrer">
                  {data.Schools.CatholicBoardWebsiteURL}
                </a>
              )}
            </div>
          </div>
          {data.Schools?.PublicElementry && (
            <div>
              <div className="sc-property-report-html-label">Public Elementary: </div>
              <div className="sc-property-report-html-value">{data.Schools.PublicElementry}</div>
            </div>
          )}
          {data.Schools?.PublicSecondary && (
            <div>
              <div className="sc-property-report-html-label">Public Secondary: </div>
              <div className="sc-property-report-html-value">{data.Schools.PublicSecondary}</div>
            </div>
          )}
          {data.Schools?.PublicLookup && (
            <div>
              <div className="sc-property-report-html-label">Public School Lookup: </div>
              <div className="sc-property-report-html-value">
                <a href={data.Schools.PublicLookup} target="_blank" rel="noopener noreferrer">
                  School Lookup
                </a>
              </div>
            </div>
          )}
          <div>
            <div className="sc-property-report-html-label">Public School Board Website: </div>
            <div className="sc-property-report-html-value">
              {data.Schools?.PublicBoardWebsiteURL && (
                <a href={data.Schools.PublicBoardWebsiteURL} target="_blank" rel="noopener noreferrer">
                  {data.Schools.PublicBoardWebsiteURL}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* OTHER */}
        <div className="sc-property-report-html-heading icon general">Other</div>
        <div className="sc-property-report-html-container">
          <div>
            <div className="sc-property-report-html-label">Library: </div>
            <div className="sc-property-report-html-value">{data.Other?.Library ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Closest Fire Hydrant: </div>
            <div className="sc-property-report-html-value">{data.Other?.ClosestFireHydrant ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Municipal Admin Centre: </div>
            <div className="sc-property-report-html-value">{data.Other?.MunicipalAdminCentre ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Closest Hospital: </div>
            <div className="sc-property-report-html-value">{data.Other?.ClosestHospital ?? ""}</div>
          </div>
          <div>
            <div className="sc-property-report-html-label">Potential Broadband Coverage: </div>
            <div className="sc-property-report-html-value">{data.Other?.BroadbandSpeed ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

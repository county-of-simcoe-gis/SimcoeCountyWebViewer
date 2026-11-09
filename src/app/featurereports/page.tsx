"use client";

import { useEffect, useState } from "react";
import ChildCareReport from "@/components/FeatureReports/ChildCareReport";
import ForestryReport from "@/components/FeatureReports/ForestryReport";
import RealEstateReport from "@/components/FeatureReports/RealEstateReport";
import { useScrollablePage } from "@/hooks/useScrollablePage";
import { fetchFeatureReport, isFeatureReportType, type FeatureReportProps, type FeatureReportType } from "@/utils/featureReports";
import { getLegacyParam } from "@/utils/legacyUrlParams";

type PageState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "error" }
  | { status: "ready"; type: FeatureReportType; id: string; showHeader: boolean; info: FeatureReportProps };

// Legacy URL: /featurereports/?TYPE=REALESTATE|FORESTRY|CHILDCARE&ID=<id>&SHOWHEADER=1
export default function FeatureReportsPage() {
  useScrollablePage();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    const search = window.location.search;
    const type = getLegacyParam(search, "TYPE");
    const id = getLegacyParam(search, "ID");
    const showHeader = getLegacyParam(search, "SHOWHEADER") === "1";

    if (!isFeatureReportType(type) || !id) {
      setState({ status: "invalid" });
      return;
    }

    let cancelled = false;

    fetchFeatureReport(type, id)
      .then((info) => {
        if (cancelled) return;
        setState(info ? { status: "ready", type, id, showHeader, info } : { status: "error" });
      })
      .catch((err) => {
        console.error("Error loading feature report:", err);
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <div className="flex justify-center items-center min-h-[300px] text-xl text-gray-600">Loading report...</div>;
  }

  if (state.status === "invalid") {
    return <div className="text-red-700 text-center py-10 px-5 text-xl">Invalid Parameters. This app needs a TYPE and ID.</div>;
  }

  if (state.status === "error") {
    return <div className="text-red-700 text-center py-10 px-5 text-xl">Feature not found.</div>;
  }

  switch (state.type) {
    case "REALESTATE":
      return <RealEstateReport id={state.id} info={state.info} showHeader={state.showHeader} />;
    case "FORESTRY":
      return <ForestryReport info={state.info} showHeader={state.showHeader} />;
    case "CHILDCARE":
      return <ChildCareReport info={state.info} showHeader={state.showHeader} />;
  }
}

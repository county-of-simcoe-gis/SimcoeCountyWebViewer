"use client";

import { useEffect, useState } from "react";
import LayerInfo from "@/components/LayerInfo/LayerInfo";
import { useScrollablePage } from "@/hooks/useScrollablePage";
import { getLegacyParam } from "@/utils/legacyUrlParams";

// Legacy URL: /layerInfo/?URL=<geoserver or arcgis layer json url>&SHOW_DOWNLOAD=1
export default function LayerInfoPage() {
  useScrollablePage();
  const [params, setParams] = useState<{ layerURL: string; showDownload: boolean } | null>(null);

  useEffect(() => {
    const search = window.location.search;
    setParams({
      layerURL: getLegacyParam(search, "URL") ?? "",
      showDownload: getLegacyParam(search, "SHOW_DOWNLOAD") === "1",
    });
  }, []);

  if (!params) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <LayerInfo layerURL={params.layerURL} showDownload={params.showDownload} />
    </div>
  );
}

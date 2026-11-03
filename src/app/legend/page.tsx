"use client";

import { useEffect, useState } from "react";
import Legend from "@/components/Legend/Legend";
import { useConfig } from "@/hooks/useConfig";
import { useScrollablePage } from "@/hooks/useScrollablePage";
import { useLegendStore, type LegendObject } from "@/stores/legendStore";
import type { TOCLayerGroup } from "@/stores/tocStore";
import { loadLayerGroupsFromSources } from "@/utils/tocHelpers";
import { selectLegendGroups } from "@/utils/legacyUrlParams";

type LegendConfig = Parameters<typeof loadLayerGroupsFromSources>[1];

// Legacy URL: /legend/?Popular=1&All_Layers=0 (group name = 1 shows the group)
export default function LegendPage() {
  useScrollablePage();
  const { config, error: configError } = useConfig();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!config) return;

    let cancelled = false;

    const load = async () => {
      try {
        // Secured sources are skipped so the legend stays public.
        const publicSources = (config.toc.sources ?? []).filter((source) => !source.secure);
        const { groups } = await loadLayerGroupsFromSources(publicSources, config as unknown as LegendConfig);
        if (cancelled) return;

        const allGroups = groups.map((group: TOCLayerGroup) => ({
          label: group.label,
          value: group.value,
          layers: group.layers.map((layer) => ({ ...layer, legendObj: layer.legendObj as LegendObject | undefined })),
        }));

        useLegendStore.getState().openLegend(allGroups, selectLegendGroups(allGroups, window.location.search));
        setStatus("ready");
      } catch (err) {
        console.error("Error loading legend groups:", err);
        if (!cancelled) setStatus("error");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [config]);

  if (configError || status === "error") {
    return <h3 className="text-red-700 text-center py-10 px-5 text-xl">Unable to load the legend.</h3>;
  }

  if (status === "loading") {
    return <div className="flex justify-center items-center min-h-[300px] text-xl text-gray-600">Loading legend...</div>;
  }

  return <Legend />;
}

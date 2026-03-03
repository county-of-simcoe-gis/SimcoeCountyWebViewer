"use client";

import { useEffect } from "react";
import Layout from "@/components/Layout";
import { useAppStore } from "@/stores/appStore";
import { getAllURLParameters } from "@/utils/helpersUrl";
import { migrateFromLegacyStorage } from "@/utils/storageMigration";

export default function Home() {
  const { setAppInfo, setHeaderLoading, setSidebarLoading, setUrlParameters } = useAppStore();

  useEffect(() => {
    // Migrate old-app localStorage data before any stores read it
    migrateFromLegacyStorage();

    // Initialize URL parameters from current URL
    const urlParams = getAllURLParameters();
    setUrlParameters(urlParams);

    // Initialize app info (similar to old app)
    setAppInfo({
      name: "simcoecountywebviewernextjs",
      version: "0.1.0",
      homepage: "",
    });

    // Simulate loading completion
    setTimeout(() => {
      setHeaderLoading(false);
    }, 1000);

    setTimeout(() => {
      setSidebarLoading(false);
    }, 1500);

    // Tools and themes are now loaded from config in Layout.tsx via loadFromConfig()
  }, [setAppInfo, setHeaderLoading, setSidebarLoading, setUrlParameters]);

  return <Layout />;
}

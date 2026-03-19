"use client";

import { useEffect } from "react";
import Layout from "@/components/Layout";
import { useAppStore } from "@/stores/appStore";
import { getAllURLParameters } from "@/utils/helpersUrl";
import { migrateFromLegacyStorage } from "@/utils/storageMigration";

export default function Home() {
  const setAppInfo = useAppStore((s) => s.setAppInfo);
  const setHeaderLoading = useAppStore((s) => s.setHeaderLoading);
  const setSidebarLoading = useAppStore((s) => s.setSidebarLoading);
  const setUrlParameters = useAppStore((s) => s.setUrlParameters);

  // Diagnostic: catch "Cannot commit the same tree" and log a stack trace
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message?.includes("Cannot commit the same tree")) {
        console.error(
          "[DIAG] 🔴 'Cannot commit the same tree' intercepted!\n" +
            "       This means a Zustand store set() fired synchronously during React's commit phase.\n" +
            "       Look at the stack trace below to find which store/component triggered it.",
        );
        console.trace("[DIAG] 🔴 Stack trace at error interception");
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

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

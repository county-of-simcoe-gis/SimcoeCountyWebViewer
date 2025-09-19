"use client";

import { useEffect } from "react";
import Layout from "@/components/Layout";
import { useAppStore } from "@/stores/appStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { getAllURLParameters } from "@/utils/helpersUrl";

export default function Home() {
  const { setAppInfo, setHeaderLoading, setSidebarLoading, setUrlParameters } = useAppStore();
  const { setThemes, setTools } = useSidebarStore();

  useEffect(() => {
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

    // Initialize with some dummy themes and tools for testing
    setThemes([
      { id: "property", name: "Property Information", type: "theme", imageName: "default.png", enabled: true },
      { id: "roads", name: "Roads & Transportation", type: "theme", imageName: "default.png", enabled: true },
      { id: "environment", name: "Environment", type: "theme", imageName: "default.png", enabled: true },
    ]);

    setTools([
      { id: "measure", name: "Measure", type: "tool", imageName: "default.png", enabled: true },
      { id: "print", name: "Print", type: "tool", imageName: "default.png", enabled: true },
      { id: "search", name: "Search", type: "tool", imageName: "default.png", enabled: true },
      { id: "settings", name: "Settings", type: "tool", imageName: "default.png", enabled: true },
    ]);
  }, [setAppInfo, setHeaderLoading, setSidebarLoading, setThemes, setTools, setUrlParameters]);

  return <Layout />;
}

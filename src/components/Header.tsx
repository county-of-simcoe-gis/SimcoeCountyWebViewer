"use client";

import "./Header.css";
import { useEffect } from "react";
import Image from "next/image";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import Search from "./Search";
import SearchZoom from "./SearchZoom";

export default function Header() {
  const { toggleSidebar } = useSidebarStore();
  const { emitHeaderLoaded } = useEventStore();
  const { addLoadedItem } = useMapStore();
  const { setHeaderLoading, config } = useAppStore();

  useEffect(() => {
    // Mark header as loaded (replaces window.emitter.emit("headerLoaded"))
    emitHeaderLoaded();
    addLoadedItem("header");
    setHeaderLoading(false);
  }, [emitHeaderLoaded, addLoadedItem, setHeaderLoading]);

  const onFeedbackClick = () => {
    // TODO: Implement feedback functionality
    console.log("Feedback clicked");
  };

  const handleBurgerClick = () => {
    toggleSidebar();
  };

  // Get logo image from config, with fallback
  const getLogoImage = () => {
    if (config?.headerLogoImageName) {
      // If the config value already includes a path, use it as-is
      if (config.headerLogoImageName.startsWith("/") || config.headerLogoImageName.startsWith("http")) {
        return config.headerLogoImageName;
      }
      // Otherwise, prepend the /images/ path
      return `/images/${config.headerLogoImageName}`;
    }
    // Fallback to original logo
    return "/images/logo.png";
  };

  return (
    <div
      className="w-full border-b border-gray-300 flex items-center h-[52px] max-h-[52px] p-0 z-auto absolute left-0 top-0 right-0 bottom-auto"
      style={{
        background: "linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(229, 229, 229, 1) 100%)",
      }}
    >
      {/* Burger Button */}
      <div
        className="cursor-pointer ml-3 w-[65px] h-11 flex items-center justify-center pt-1 outline-none bg-transparent"
        onClick={handleBurgerClick}
        role="button"
        tabIndex={2}
        onKeyDown={(e) => e.key === "Enter" && handleBurgerClick()}
        aria-label="Toggle sidebar"
      >
        <Image src="/images/burger-button.png" alt="Menu" width={32} height={32} className="max-w-full max-h-full" />
      </div>

      {/* Logo */}
      <div className="flex items-end pl-2 w-[111px]">
        <Image src={getLogoImage()} alt={config?.title || "Simcoe County"} width={111} height={40} className="max-w-full max-h-full w-auto h-auto" />
      </div>

      {/* Search Container - takes remaining space */}
      <div className="flex-1 pt-1.5 pr-3 relative">
        <Search
          className="w-full"
          placeholder="Search..."
          onResultSelect={(result) => {
            console.log("Search result selected:", result);
            // Handle search result selection
          }}
        />
        <SearchZoom />
      </div>

      {/* Feedback Button */}
      <div
        className="w-[60px] text-center flex flex-col items-center justify-center cursor-pointer px-1 text-xs text-[#5b5b5b] h-[52px] hover:bg-black hover:bg-opacity-5"
        onClick={onFeedbackClick}
        title="Feedback"
      >
        <Image src="/images/feedback.png" alt="Feedback" width={16} height={16} className="mt-1 mb-1" />
        <span>Feedback</span>
      </div>
    </div>
  );
}

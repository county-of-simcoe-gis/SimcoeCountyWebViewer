"use client";

import { useEffect } from "react";
import Image from "next/image";
import { FaBars, FaEnvelope, FaQuestionCircle } from "react-icons/fa";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import Search from "@/components/Search";
import SearchZoom from "@/components/SearchZoom";
import ProfileButton from "@/components/ProfileButton";
import { showFeedbackWindow } from "@/utils/mapHelpers";

export default function Header() {
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);
  const emitHeaderLoaded = useEventStore((s) => s.emitHeaderLoaded);
  const addLoadedItem = useMapStore((s) => s.addLoadedItem);
  const map = useMapStore((s) => s.map);
  const setHeaderLoading = useAppStore((s) => s.setHeaderLoading);
  const config = useAppStore((s) => s.config);

  useEffect(() => {
    // Mark header as loaded (replaces window.emitter.emit("headerLoaded"))
    emitHeaderLoaded();
    addLoadedItem("header");
    setHeaderLoading(false);
  }, [emitHeaderLoaded, addLoadedItem, setHeaderLoading]);

  const onFeedbackClick = () => {
    if (config?.showHelpButtonInsteadOfFeedback && config?.helpUrl) {
      window.open(config.helpUrl, "_blank");
    } else if (config?.feedbackUrl) {
      showFeedbackWindow(map, config.feedbackUrl as string);
    } else if (config?.feedback_contact) {
      window.location.href = `mailto:${config.feedback_contact}`;
    }
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
    <div className="w-full border-b border-gray-300 flex items-center h-[52px] max-h-[52px] p-0 z-[1001] absolute left-0 top-0 right-0 bottom-auto bg-[image:var(--sc-gradient-default)]">
      {/* Burger Button */}
      <div
        className="cursor-pointer w-[65px] h-11 flex items-center justify-center pt-1 outline-none bg-transparent rounded transition-colors duration-150 hover:bg-black/10 active:bg-black/20"
        onClick={handleBurgerClick}
        role="button"
        tabIndex={2}
        onKeyDown={(e) => e.key === "Enter" && handleBurgerClick()}
        aria-label="Toggle sidebar"
      >
        <FaBars size={32} className="max-w-full max-h-full" />
      </div>

      {/* Logo */}
      <div className="flex items-center mr-2.5 shrink-0">
        <Image src={getLogoImage()} alt={config?.title || "Simcoe County"} width={92} height={45} className="w-[92px] h-[45px] object-contain" />
      </div>

      {/* Search Container - takes remaining space */}
      <div className="flex-1 pr-3 relative">
        {!config?.hideSearch && (
          <Search
            className="w-full"
            onResultSelect={() => {
              // Handle search result selection
            }}
          />
        )}
        <SearchZoom />
      </div>

      {/* Profile Button */}
      <ProfileButton />

      {/* Feedback / Help Button */}
      <div
        className="w-[60px] text-center flex flex-col items-center justify-center cursor-pointer px-1 text-xs text-[#5b5b5b] h-[52px] hover:bg-black hover:bg-opacity-5 mt-[5px]"
        onClick={onFeedbackClick}
        title={config?.showHelpButtonInsteadOfFeedback ? "Help" : "Feedback"}
      >
        {config?.showHelpButtonInsteadOfFeedback ? (
          <>
            <FaQuestionCircle size={16} className="mt-1 mb-1" />
            <span>Help</span>
          </>
        ) : (
          <>
            <FaEnvelope size={16} className="mt-1 mb-1" />
            <span>Feedback</span>
          </>
        )}
      </div>
    </div>
  );
}

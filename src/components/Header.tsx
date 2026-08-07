"use client";

import { useEffect } from "react";
import { FaBars, FaEnvelope, FaQuestionCircle } from "react-icons/fa";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import Search from "@/components/Search";
import SearchZoom from "@/components/SearchZoom";
import ProfileButton from "@/components/ProfileButton";
import LogoImage from "@/components/shared/LogoImage";
import { showFeedbackWindow } from "@/utils/mapHelpers";

export default function Header() {
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);
  const addLoadedItem = useMapStore((s) => s.addLoadedItem);
  const map = useMapStore((s) => s.map);
  const setHeaderLoading = useAppStore((s) => s.setHeaderLoading);
  const config = useAppStore((s) => s.config);

  useEffect(() => {
    // Mark header as loaded
    addLoadedItem("header");
    setHeaderLoading(false);
  }, [addLoadedItem, setHeaderLoading]);

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

  return (
    <div className="w-full border-b border-gray-300 dark:border-gray-700 flex items-center h-[52px] max-h-[52px] p-0 z-[1001] absolute left-0 top-0 right-0 bottom-auto bg-[image:var(--sc-gradient-default)]">
      {/* Burger Button */}
      <div
        className="cursor-pointer w-[65px] h-11 flex items-center justify-center pt-1 outline-none bg-transparent rounded transition-colors duration-150 hover:bg-black/10 active:bg-black/20"
        onClick={handleBurgerClick}
        role="button"
        tabIndex={2}
        onKeyDown={(e) => e.key === "Enter" && handleBurgerClick()}
        aria-label="Toggle sidebar"
      >
        <FaBars size={32} className="max-w-full max-h-full text-base-content" />
      </div>

      {/* Logo */}
      <div className={`relative flex items-center mr-2.5 shrink-0 max-[770px]:hidden ${config?.draft ? "sc-draft-header" : ""}`}>
        <LogoImage headerLogoImageName={config?.headerLogoImageName} alt={config?.title || "Simcoe County"} containerClassName="max-h-[50px]" className="max-h-[50px] max-w-[200px]" />
        {config?.logoOverlayText && (
          <span className="absolute top-2 left-[-6px] text-[10px] font-bold leading-none px-1.5 py-0.5 bg-primary text-primary-content opacity-90 pointer-events-none select-none -rotate-12 shadow-sm">
            {config.logoOverlayText}
          </span>
        )}
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
      <div className="max-[770px]:hidden">
        <ProfileButton />
      </div>

      {/* Feedback / Help Button */}
      <div
        className="w-[60px] text-center flex flex-col items-center justify-center cursor-pointer px-1 text-xs text-neutral h-[52px] hover:bg-black/5 dark:hover:bg-white/5 mt-[5px] max-[770px]:hidden"
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

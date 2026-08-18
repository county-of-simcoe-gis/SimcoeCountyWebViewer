"use client";

import { useCallback, useEffect, useState } from "react";
import { useURLModalStore } from "@/stores/urlModalStore";
import { appendSharedArrayItem } from "@/utils/storage";
import { FaExternalLinkAlt, FaTimes } from "react-icons/fa";

/**
 * Global URL Window — overlays the map area with an iframe, matching old app behaviour.
 * Positioned to the right of the sidebar, just like the old URLWindow.
 */
export default function GlobalURLModal() {
  const isOpen = useURLModalStore((s) => s.isOpen);
  const url = useURLModalStore((s) => s.url);
  const title = useURLModalStore((s) => s.title);
  const showFooter = useURLModalStore((s) => s.showFooter);
  const hideScroll = useURLModalStore((s) => s.hideScroll);
  const close = useURLModalStore((s) => s.close);
  const [isLoading, setIsLoading] = useState(true);

  const handleDontShowAgain = useCallback(() => {
    const storageKey = "sc_dontshowagain";
    appendSharedArrayItem(storageKey, { url, dateAdded: new Date().toLocaleString() });
    close();
  }, [url, close]);

  // Reset loading state when URL changes
  useEffect(() => {
    if (isOpen) setIsLoading(true);
  }, [isOpen, url]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  const handlePopout = useCallback(() => {
    window.open(url, "_blank");
    close();
  }, [url, close]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-[62px] left-2.5 right-2.5 bottom-2.5 z-[200000] bg-base-100 rounded-t-[5px] flex flex-col transition-[left] duration-300 ease-in-out shadow-[0_0_12px_2px_rgba(0,0,0,0.25)]">
      {/* Header bar */}
      <div className="h-11 min-h-[44px] bg-[image:var(--sc-gradient-header)] rounded-t-[5px] flex items-center px-2 text-white select-none">
        <span className="flex-1 text-sm font-medium">{title}</span>

        {/* Pop-out button */}
        <button
          onClick={handlePopout}
          title="Open in New Window"
          className="w-8 h-[30px] mr-2 border border-[#3672b1] rounded-[3px] bg-white/15 text-white cursor-pointer flex items-center justify-center text-base"
        >
          <FaExternalLinkAlt />
        </button>

        {/* Close button */}
        <button onClick={close} title="Close" className="w-8 h-[30px] border border-[#3672b1] rounded-[3px] bg-white/15 text-white cursor-pointer flex items-center justify-center text-base font-bold">
          <FaTimes />
        </button>
      </div>

      {/* Content area with iframe */}
      <div className="flex-1 relative m-[7px] border border-base-300 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        )}
        <iframe src={url} title={title} onLoad={() => setIsLoading(false)} className={`w-full h-full border-none ${hideScroll ? "overflow-hidden" : "overflow-auto"}`} />
      </div>

      {/* Footer with Close and Don't Show Again buttons */}
      {showFooter && (
        <div className="w-full text-right px-3.5 py-2 border-t border-base-300 bg-base-100">
          <button onClick={close} className="btn btn-sm btn-outline mr-[5px]">
            Close Window
          </button>
          <button onClick={handleDontShowAgain} className="btn btn-sm btn-outline">
            Don&apos;t Show this Again
          </button>
        </div>
      )}
    </div>
  );
}

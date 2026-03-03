"use client";

import { useCallback, useEffect, useState } from "react";
import { useURLModalStore } from "@/stores/urlModalStore";
import { appendToStorage } from "@/utils/storage";

/**
 * Global URL Window — overlays the map area with an iframe, matching old app behaviour.
 * Positioned to the right of the sidebar, just like the old URLWindow.
 */
export default function GlobalURLModal() {
  const { isOpen, url, title, showFooter, mode, hideScroll, close } = useURLModalStore();
  const [isLoading, setIsLoading] = useState(true);

  const handleDontShowAgain = useCallback(() => {
    const storageKey = "sc_dontshowagain";
    appendToStorage(storageKey, { url, dateAdded: new Date().toLocaleString() });
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
    <div
      style={{
        position: "absolute",
        top: "62px",
        left: "10px",
        right: "10px",
        bottom: "10px",
        zIndex: 200000,
        backgroundColor: "#fff",
        borderRadius: "5px 5px 0 0",
        display: "flex",
        flexDirection: "column",
        transition: "left 0.3s ease-in-out",
        boxShadow: "0 0 12px 2px rgba(0,0,0,0.25)",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          height: "44px",
          minHeight: "44px",
          background: "linear-gradient(to bottom, #3980cc 0%, #2865a2 100%)",
          borderRadius: "5px 5px 0 0",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          color: "#fff",
          userSelect: "none",
        }}
      >
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>{title}</span>

        {/* Pop-out button */}
        <button
          onClick={handlePopout}
          title="Open in New Window"
          style={{
            width: "32px",
            height: "30px",
            marginRight: "8px",
            border: "1px solid #3672b1",
            borderRadius: "3px",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          ⧉
        </button>

        {/* Close button */}
        <button
          onClick={close}
          title="Close"
          style={{
            width: "32px",
            height: "30px",
            border: "1px solid #3672b1",
            borderRadius: "3px",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          ✕
        </button>
      </div>

      {/* Content area with iframe */}
      <div style={{ flex: 1, position: "relative", margin: "7px", border: "1px solid #ccc", overflow: "hidden" }}>
        {isLoading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9" }}>
            <span className="loading loading-spinner loading-md"></span>
          </div>
        )}
        <iframe
          src={url}
          title={title}
          onLoad={() => setIsLoading(false)}
          style={{ width: "100%", height: "100%", border: "none", overflow: hideScroll ? "hidden" : "auto" }}
        />
      </div>

      {/* Footer with Close and Don't Show Again buttons */}
      {showFooter && (
        <div
          style={{
            width: "100%",
            textAlign: "right",
            padding: "8px 14px",
            borderTop: "1px solid #ccc",
            backgroundColor: "#fff",
          }}
        >
          <button
            onClick={close}
            style={{
              padding: "6px 16px",
              marginRight: "5px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fff",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Close Window
          </button>
          <button
            onClick={handleDontShowAgain}
            style={{
              padding: "6px 16px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fff",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Don&apos;t Show this Again
          </button>
        </div>
      )}
    </div>
  );
}

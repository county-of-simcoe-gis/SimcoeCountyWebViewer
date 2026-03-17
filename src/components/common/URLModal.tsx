"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface URLModalProps {
  url: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  width?: string;
  height?: string;
}

const URLModal: React.FC<URLModalProps> = ({ url, title = "External Content", isOpen, onClose, width = "90vw", height = "80vh" }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[10000] p-5">
      <div className="bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col relative overflow-hidden max-w-[95vw] max-h-[95vh]" ref={modalRef} style={{ width, height }}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-base-300 bg-base-200 shrink-0">
          <h3 className="m-0 text-lg font-semibold text-base-content max-w-[calc(100%-40px)] overflow-hidden text-ellipsis whitespace-nowrap">{title}</h3>
          <button className="btn btn-sm btn-ghost btn-circle text-2xl" onClick={onClose} title="Close" type="button">
            ×
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden bg-base-200">
          {isLoading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-base-content/60 z-[1]">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <span>Loading...</span>
            </div>
          )}
          <iframe
            src={url}
            className={`w-full h-full border-none bg-white transition-opacity duration-300 ${isLoading ? "opacity-0" : ""}`}
            title={title}
            onLoad={handleIframeLoad}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          />
        </div>
        <div className="px-5 py-4 border-t border-base-300 bg-base-200 flex justify-end gap-3 shrink-0">
          <button className="btn btn-sm btn-ghost" onClick={() => window.open(url, "_blank")} type="button">
            Open in New Tab
          </button>
          <button className="btn btn-sm btn-primary" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document root
  if (typeof window !== "undefined") {
    const portalRoot = document.getElementById("portal-root");
    if (portalRoot) {
      return createPortal(modalContent, portalRoot);
    }
  }

  return modalContent;
};

export default URLModal;

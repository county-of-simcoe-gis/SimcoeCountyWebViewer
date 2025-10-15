"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/components/common/URLModal.css";

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
    <div className="sc-url-modal-overlay">
      <div className="sc-url-modal" ref={modalRef} style={{ width, height }}>
        <div className="sc-url-modal-header">
          <h3 className="sc-url-modal-title">{title}</h3>
          <button className="sc-url-modal-close-btn" onClick={onClose} title="Close" type="button">
            ×
          </button>
        </div>
        <div className="sc-url-modal-body">
          {isLoading && (
            <div className="sc-url-modal-loading">
              <div className="sc-url-modal-spinner"></div>
              <span>Loading...</span>
            </div>
          )}
          <iframe
            src={url}
            className={`sc-url-modal-iframe ${isLoading ? "sc-url-modal-iframe-loading" : ""}`}
            title={title}
            onLoad={handleIframeLoad}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          />
        </div>
        <div className="sc-url-modal-footer">
          <button className="sc-url-modal-btn sc-url-modal-btn-secondary" onClick={() => window.open(url, "_blank")} type="button">
            Open in New Tab
          </button>
          <button className="sc-url-modal-btn sc-url-modal-btn-primary" onClick={onClose} type="button">
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

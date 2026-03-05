"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import "./PrintPreviewModal.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface PrintPreviewModalProps {
  /** The preview image blob */
  previewBlob: Blob | null;
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Title of the map */
  mapTitle: string;
  /** Export settings summary */
  settings: {
    format: string;
    size: string;
    dpi: number;
    supportedLayers: number;
    unsupportedLayers: number;
  };
  /** Called when user confirms download */
  onDownload: () => void;
  /** Called when user cancels */
  onClose: () => void;
  /** Whether download is in progress */
  isDownloading?: boolean;
  /** Current progress message */
  progressMessage?: string;
}

export default function PrintPreviewModal({ previewBlob, isOpen, mapTitle, settings, onDownload, onClose, isDownloading = false, progressMessage = "" }: PrintPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Create object URL for preview
  useEffect(() => {
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      setPreviewUrl(url);
      setImageLoaded(false);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [previewBlob]);

  if (!isOpen) {
    return null;
  }

  const fileSizeKB = previewBlob ? Math.round(previewBlob.size / 1024) : 0;

  return (
    <div className="print-preview-overlay" onClick={onClose}>
      <div className="print-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="print-preview-header">
          <h2>Print Preview</h2>
          <button className="print-preview-close" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        {/* Preview Content */}
        <div className="print-preview-content">
          {/* Image Preview */}
          <div className="print-preview-image-container">
            {previewUrl ? (
              <>
                {!imageLoaded && (
                  <div className="print-preview-loading">
                    <div className="print-preview-spinner"></div>
                    <span>Loading preview...</span>
                  </div>
                )}
                <img src={previewUrl} alt="Map Preview" className={`print-preview-image ${imageLoaded ? "loaded" : ""}`} onLoad={() => setImageLoaded(true)} />
              </>
            ) : (
              <div className="print-preview-loading">
                <div className="print-preview-spinner"></div>
                <span>{progressMessage || "Generating preview..."}</span>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="print-preview-info">
            <h3>{mapTitle}</h3>

            <div className="print-preview-settings">
              <div className="print-preview-setting">
                <label>Format:</label>
                <span>{settings.format.toUpperCase()}</span>
              </div>
              <div className="print-preview-setting">
                <label>Size:</label>
                <span>{settings.size}</span>
              </div>
              <div className="print-preview-setting">
                <label>Resolution:</label>
                <span>{settings.dpi} DPI</span>
              </div>
              <div className="print-preview-setting">
                <label>File Size:</label>
                <span>{fileSizeKB > 1024 ? `${(fileSizeKB / 1024).toFixed(1)} MB` : `${fileSizeKB} KB`}</span>
              </div>
            </div>

            <div className="print-preview-layers">
              <h4>Layer Rendering</h4>
              <div className="print-preview-layer-info">
                <div className="layer-stat supported">
                  <span className="layer-count">{settings.supportedLayers}</span>
                  <span className="layer-label">High-res (inkmap)</span>
                </div>
                <div className="layer-stat unsupported">
                  <span className="layer-count">{settings.unsupportedLayers}</span>
                  <span className="layer-label">Canvas capture</span>
                </div>
              </div>
              {settings.unsupportedLayers > 0 && <p className="print-preview-note">Some layers were captured from the map canvas. These may appear at lower resolution.</p>}
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="print-preview-footer">
          <button className="print-preview-btn cancel" onClick={onClose} disabled={isDownloading}>
            Cancel
          </button>
          <button className="print-preview-btn download" onClick={onDownload} disabled={isDownloading || !previewBlob}>
            {isDownloading ? (
              <>
                <Image src={`${basePath}/images/loading20.gif`} alt="loading" width={16} height={16} unoptimized />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

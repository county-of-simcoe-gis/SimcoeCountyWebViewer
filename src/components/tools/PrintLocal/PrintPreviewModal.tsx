"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-5" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-w-[900px] max-h-[90vh] w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#e0e0e0] bg-[#f5f5f5]">
          <h2 className="m-0 text-lg font-semibold text-[#333]">Print Preview</h2>
          <button
            className="bg-transparent border-none text-[28px] cursor-pointer text-[#666] w-9 h-9 flex items-center justify-center rounded hover:bg-[#e0e0e0] hover:text-[#333] transition-colors"
            onClick={onClose}
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex flex-1 overflow-hidden min-h-[300px] max-md:flex-col">
          {/* Image Preview */}
          <div className="flex-1 flex items-center justify-center bg-[#f0f0f0] overflow-auto p-5 relative min-w-0">
            {previewUrl ? (
              <>
                {!imageLoaded && (
                  <div className="flex flex-col items-center justify-center gap-3 text-[#666]">
                    <div className="w-10 h-10 border-[3px] border-[#e0e0e0] border-t-[#1976d2] rounded-full animate-spin"></div>
                    <span>Loading preview...</span>
                  </div>
                )}
                {}
                <img
                  src={previewUrl}
                  alt="Map Preview"
                  className={`max-w-full max-h-[60vh] object-contain shadow-[0_4px_16px_rgba(0,0,0,0.2)] border border-[#ddd] transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-[#666]">
                <div className="w-10 h-10 border-[3px] border-[#e0e0e0] border-t-[#1976d2] rounded-full animate-spin"></div>
                <span>{progressMessage || "Generating preview..."}</span>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="w-[280px] p-5 border-l border-[#e0e0e0] overflow-y-auto bg-[#fafafa] max-md:w-full max-md:border-l-0 max-md:border-t max-md:border-[#e0e0e0] max-md:max-h-[200px]">
            <h3 className="m-0 mb-4 text-base font-semibold text-[#333] pb-3 border-b-2 border-[#1976d2]">{mapTitle}</h3>

            <div className="mb-5">
              <div className="flex justify-between py-2 border-b border-[#e8e8e8]">
                <label className="text-[#666] text-[13px]">Format:</label>
                <span className="font-medium text-[#333] text-[13px]">{settings.format.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#e8e8e8]">
                <label className="text-[#666] text-[13px]">Size:</label>
                <span className="font-medium text-[#333] text-[13px]">{settings.size}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#e8e8e8]">
                <label className="text-[#666] text-[13px]">Resolution:</label>
                <span className="font-medium text-[#333] text-[13px]">{settings.dpi} DPI</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#e8e8e8]">
                <label className="text-[#666] text-[13px]">File Size:</label>
                <span className="font-medium text-[#333] text-[13px]">{fileSizeKB > 1024 ? `${(fileSizeKB / 1024).toFixed(1)} MB` : `${fileSizeKB} KB`}</span>
              </div>
            </div>

            <div>
              <h4 className="m-0 mb-3 text-sm font-semibold text-[#333]">Layer Rendering</h4>
              <div className="flex gap-3 mb-3">
                <div className="flex-1 p-[10px] rounded-md text-center bg-[#e8f5e9] border border-[#a5d6a7]">
                  <span className="block text-xl font-bold text-[#333]">{settings.supportedLayers}</span>
                  <span className="block text-[11px] text-[#666] mt-0.5">High-res (inkmap)</span>
                </div>
                <div className="flex-1 p-[10px] rounded-md text-center bg-[#fff3e0] border border-[#ffcc80]">
                  <span className="block text-xl font-bold text-[#333]">{settings.unsupportedLayers}</span>
                  <span className="block text-[11px] text-[#666] mt-0.5">Canvas capture</span>
                </div>
              </div>
              {settings.unsupportedLayers > 0 && (
                <p className="text-xs text-[#666] bg-[#fff8e1] p-[10px] rounded border-l-[3px] border-[#ffc107] m-0 leading-[1.4]">
                  Some layers were captured from the map canvas. These may appear at lower resolution.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#e0e0e0] bg-[#f5f5f5]">
          <button
            className="flex items-center gap-2 py-[10px] px-5 border-none rounded-md text-sm font-medium cursor-pointer transition-all bg-[#e0e0e0] text-[#333] hover:not-disabled:bg-[#d0d0d0] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={isDownloading}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 py-[10px] px-5 border-none rounded-md text-sm font-medium cursor-pointer transition-all bg-[#1976d2] text-white hover:not-disabled:bg-[#1565c0] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onDownload}
            disabled={isDownloading || !previewBlob}
          >
            {isDownloading ? (
              <>
                <Image src="/images/loading20.gif" alt="loading" width={16} height={16} />
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

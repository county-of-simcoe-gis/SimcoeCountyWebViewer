"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FaTimes } from "react-icons/fa";

interface URLModalProps {
  url: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  width?: string;
  height?: string;
}

const URLModal: React.FC<URLModalProps> = ({ url, title = "External Content", isOpen, onClose, width = "90vw", height = "80vh" }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[95vw] max-h-[95vh] p-0 flex flex-col overflow-hidden" style={{ width, height }}>
      <div className="flex justify-between items-center px-5 py-4 border-b border-base-300 bg-base-200 shrink-0">
        <h3 className="m-0 text-lg font-semibold text-base-content max-w-[calc(100%-40px)] overflow-hidden text-ellipsis whitespace-nowrap">{title}</h3>
        <button className="btn btn-sm btn-ghost btn-circle text-2xl" onClick={onClose} title="Close" type="button">
          <FaTimes />
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
    </Modal>
  );
};

export default URLModal;

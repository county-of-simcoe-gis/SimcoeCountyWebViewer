"use client";

import React, { useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { useDisclaimerModalStore } from "@/stores/disclaimerModalStore";

const colorClasses: Record<string, string> = {
  neutral: "bg-base-100",
  warning: "bg-orange-50",
  error: "bg-red-50",
  info: "bg-blue-50",
  success: "bg-green-50",
};

const titleClasses: Record<string, string> = {
  neutral: "text-base-content",
  warning: "text-orange-700",
  error: "text-red-700",
  info: "text-blue-700",
  success: "text-green-700",
};

export default function DisclaimerModal() {
  const { isOpen, title, message, url, color, acceptLabel, showAccept, declineLabel, showDecline, onAccept, onDecline, close } = useDisclaimerModalStore();

  const handleAccept = useCallback(() => {
    close();
    onAccept?.();
  }, [close, onAccept]);

  const handleDecline = useCallback(() => {
    close();
    onDecline?.();
  }, [close, onDecline]);

  return (
    <Modal isOpen={isOpen} onClose={handleDecline} className={`max-w-md ${colorClasses[color] ?? colorClasses.neutral}`}>
      <h3 className={`font-bold text-lg mb-4 ${titleClasses[color] ?? titleClasses.neutral}`}>{title || "Terms and Conditions"}</h3>

      <div className="py-2 text-base-content whitespace-pre-wrap">{message}</div>

      {url && (
        <div className="mt-4">
          <a href={url} target="_blank" rel="noopener noreferrer" className="link link-primary text-sm">
            {title || "View terms"}
          </a>
        </div>
      )}

      <div className="modal-action mt-6">
        {showDecline && (
          <button onClick={handleDecline} className="btn btn-outline btn-sm">
            {declineLabel}
          </button>
        )}
        {showAccept && (
          <button onClick={handleAccept} className="btn btn-primary btn-sm">
            {acceptLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}

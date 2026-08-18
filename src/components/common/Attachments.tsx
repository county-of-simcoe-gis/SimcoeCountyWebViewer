"use client";

import React, { useEffect, useState, useCallback } from "react";
import { showURLWindow } from "@/utils/helpersUI";

interface AttachmentInfo {
  url: string;
  name: string;
  contentType: string;
  size?: number;
}

interface AttachmentGroup {
  attachmentInfos: AttachmentInfo[];
}

interface AttachmentResponse {
  attachmentGroups?: AttachmentGroup[];
  error?: { code?: number; message?: string; details?: unknown };
}

interface AttachmentsProps {
  attachmentUrl: string;
  /** Called when any attachment item is clicked, before the default open behaviour. */
  onAttachmentClick?: (attachment: AttachmentInfo) => void;
}

/**
 * Fetches and renders individual attachment items from an ArcGIS attachment endpoint.
 * Images open in a lightbox modal; other types open in a new tab.
 * Migrated from the legacy SimcoeCountyWebViewer Attachments.jsx component.
 */
const Attachments: React.FC<AttachmentsProps> = ({ attachmentUrl, onAttachmentClick }) => {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAttachments = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const url = new URL(attachmentUrl);
        const urlParams = new URLSearchParams(url.searchParams);
        const urlToken = urlParams.get("token");
        setToken(urlToken);

        const response = await fetch(attachmentUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: AttachmentResponse = await response.json();

        // ArcGIS often returns HTTP 200 with an error body, e.g.
        // { error: { code: 500, message: "Error performing queryAttachments operation" } }
        if (data?.error) {
          throw new Error(`ArcGIS error ${data.error.code ?? ""}: ${data.error.message ?? "Unknown error"}`.trim());
        }

        if (!cancelled) {
          if (data.attachmentGroups && data.attachmentGroups.length > 0) {
            setAttachments(data.attachmentGroups[0].attachmentInfos ?? []);
          } else {
            setAttachments([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch attachments:", err);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAttachments();
    return () => {
      cancelled = true;
    };
  }, [attachmentUrl, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const getAttachmentUrl = useCallback(
    (baseUrl: string) => {
      return token ? `${baseUrl}?token=${token}` : baseUrl;
    },
    [token],
  );

  const handleAttachmentClick = useCallback(
    (attachment: AttachmentInfo) => {
      onAttachmentClick?.(attachment);
      const url = getAttachmentUrl(attachment.url);
      if (attachment.contentType.includes("image")) {
        showURLWindow(url, false);
      } else {
        window.open(url, "_blank");
      }
    },
    [getAttachmentUrl, onAttachmentClick],
  );

  if (isLoading) {
    return <span className="text-xs text-gray-400 italic">Loading attachments...</span>;
  }

  if (hasError) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-error">
        <span>Attachment loading failed.</span>
        <button type="button" className="btn btn-xs btn-outline btn-error" onClick={handleRetry} aria-label="Retry loading attachments">
          Retry
        </button>
      </span>
    );
  }

  if (attachments.length === 0) {
    return <span className="text-xs text-gray-400 italic">No attachments available.</span>;
  }

  if (attachments.length === 1 && attachments[0].contentType.includes("image")) {
    const singleAttachment = attachments[0];
    return (
      <div className="flex flex-col gap-1">
        <img src={getAttachmentUrl(singleAttachment.url)} alt={singleAttachment.name} />
        <span
          className="text-blue-600 underline cursor-pointer hover:text-blue-800 text-xs w-fit"
          onClick={() => handleAttachmentClick(singleAttachment)}
          role="button"
          tabIndex={0}
          aria-label={`Open attachment ${singleAttachment.name}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleAttachmentClick(singleAttachment);
          }}
        >
          {singleAttachment.name}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0.5">
        {attachments.map((attachment, index) => (
          <span
            key={`${attachment.name}-${index}`}
            className="text-blue-600 underline cursor-pointer hover:text-blue-800 text-xs"
            onClick={() => handleAttachmentClick(attachment)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleAttachmentClick(attachment);
            }}
          >
            {attachment.name}
          </span>
        ))}
      </div>
    </>
  );
};

export default Attachments;

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
}

interface AttachmentsProps {
  attachmentUrl: string;
}

/**
 * Fetches and renders individual attachment items from an ArcGIS attachment endpoint.
 * Images open in a lightbox modal; other types open in a new tab.
 * Migrated from the legacy SimcoeCountyWebViewer Attachments.jsx component.
 */
const Attachments: React.FC<AttachmentsProps> = ({ attachmentUrl }) => {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAttachments = async () => {
      try {
        setIsLoading(true);
        const url = new URL(attachmentUrl);
        const urlParams = new URLSearchParams(url.searchParams);
        const urlToken = urlParams.get("token");
        setToken(urlToken);

        const response = await fetch(attachmentUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: AttachmentResponse = await response.json();

        if (!cancelled && data.attachmentGroups && data.attachmentGroups.length > 0) {
          setAttachments(data.attachmentGroups[0].attachmentInfos ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch attachments:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAttachments();
    return () => {
      cancelled = true;
    };
  }, [attachmentUrl]);

  const getAttachmentUrl = useCallback(
    (baseUrl: string) => {
      return token ? `${baseUrl}?token=${token}` : baseUrl;
    },
    [token]
  );

  const handleAttachmentClick = useCallback(
    (attachment: AttachmentInfo) => {
      const url = getAttachmentUrl(attachment.url);
      if (attachment.contentType.includes("image")) {
        showURLWindow(url, false);
      } else {
        window.open(url, "_blank");
      }
    },
    [getAttachmentUrl]
  );

  if (isLoading) {
    return <span className="text-xs text-gray-400 italic">Loading attachments...</span>;
  }

  if (attachments.length === 0) {
    return null;
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

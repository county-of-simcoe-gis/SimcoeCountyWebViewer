"use client";

import React from "react";
import { FaTimes } from "react-icons/fa";
import { Modal } from "@/components/ui/Modal";
import Attachments from "@/components/common/Attachments";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  attachmentUrl: string | null;
}

/**
 * Lightweight modal that hosts the shared `<Attachments>` component for a
 * single attribute-table row. Mirrors the attachment behaviour shown in the
 * Identify panel.
 */
const AttributeTableAttachmentsDialog: React.FC<Props> = ({ isOpen, onClose, title, attachmentUrl }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm truncate" title={title}>
          Attachments — {title}
        </h3>
        <button type="button" className="btn btn-xs btn-ghost btn-square" onClick={onClose} aria-label="Close attachments">
          <FaTimes size={12} />
        </button>
      </div>
      <div className="text-sm">{attachmentUrl ? <Attachments attachmentUrl={attachmentUrl} onAttachmentClick={onClose} /> : <span className="opacity-60">No attachment URL available.</span>}</div>
    </Modal>
  );
};

export default AttributeTableAttachmentsDialog;

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the modal should close (ESC, backdrop click, close button) */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Additional classes on the modal-box container */
  className?: string;
  /** Inline styles on the modal-box container */
  style?: React.CSSProperties;
  /** Portal target — defaults to document.getElementById("portal-root") or document.body */
  portalTarget?: "portal-root" | "body";
}

/**
 * Shared modal using DaisyUI `<dialog>`.
 * Handles ESC close, backdrop click, body scroll lock, and portal rendering.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = "", style, portalTarget = "portal-root" }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync open state with the dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle native dialog close event (ESC key)
  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const target = typeof window !== "undefined" ? (portalTarget === "portal-root" ? document.getElementById("portal-root") : null) || document.body : null;

  if (!target) return null;

  return createPortal(
    <dialog ref={dialogRef} className="modal" onClose={handleDialogClose}>
      <div className={`modal-box ${className}`} style={style}>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="submit">close</button>
      </form>
    </dialog>,
    target,
  );
};

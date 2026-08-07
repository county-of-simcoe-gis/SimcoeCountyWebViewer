import { create } from "zustand";

export interface DisclaimerModalOptions {
  acceptLabel?: string;
  showAccept?: boolean;
  declineLabel?: string;
  showDecline?: boolean;
  color?: "neutral" | "warning" | "error" | "info" | "success";
}

interface DisclaimerModalState {
  isOpen: boolean;
  title: string;
  message: string;
  url: string;
  color: "neutral" | "warning" | "error" | "info" | "success";
  acceptLabel: string;
  showAccept: boolean;
  declineLabel: string;
  showDecline: boolean;
  onAccept: (() => void) | null;
  onDecline: (() => void) | null;
  open: (
    title: string,
    message: string,
    url?: string,
    options?: DisclaimerModalOptions,
    callbacks?: { onAccept?: () => void; onDecline?: () => void },
  ) => void;
  close: () => void;
}

export const useDisclaimerModalStore = create<DisclaimerModalState>((set) => ({
  isOpen: false,
  title: "",
  message: "",
  url: "",
  color: "neutral",
  acceptLabel: "Accept",
  showAccept: true,
  declineLabel: "Decline",
  showDecline: true,
  onAccept: null,
  onDecline: null,
  open: (title, message, url = "", options = {}, callbacks = {}) =>
    set({
      isOpen: true,
      title,
      message,
      url,
      color: options.color ?? "neutral",
      acceptLabel: options.acceptLabel ?? "Accept",
      showAccept: options.showAccept ?? true,
      declineLabel: options.declineLabel ?? "Decline",
      showDecline: options.showDecline ?? true,
      onAccept: callbacks.onAccept ?? null,
      onDecline: callbacks.onDecline ?? null,
    }),
  close: () =>
    set({
      isOpen: false,
      title: "",
      message: "",
      url: "",
      color: "neutral",
      acceptLabel: "Accept",
      showAccept: true,
      declineLabel: "Decline",
      showDecline: true,
      onAccept: null,
      onDecline: null,
    }),
}));

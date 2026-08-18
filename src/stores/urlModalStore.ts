import { create } from "zustand";

interface URLModalState {
  isOpen: boolean;
  url: string;
  title: string;
  showFooter: boolean;
  honorDontShow: boolean;
  mode: string;
  hideScroll: boolean;
  open: (url: string, title?: string, options?: { showFooter?: boolean; honorDontShow?: boolean; mode?: string; hideScroll?: boolean }) => void;
  close: () => void;
}

export const useURLModalStore = create<URLModalState>((set) => ({
  isOpen: false,
  url: "",
  title: "Information",
  showFooter: false,
  honorDontShow: false,
  mode: "normal",
  hideScroll: false,
  open: (url, title = "Information", options = {}) =>
    set({
      isOpen: true,
      url,
      title,
      showFooter: options.showFooter ?? false,
      honorDontShow: options.honorDontShow ?? false,
      mode: options.mode ?? "normal",
      hideScroll: options.hideScroll ?? false,
    }),
  close: () =>
    set({
      isOpen: false,
      url: "",
      title: "Information",
      showFooter: false,
      honorDontShow: false,
      mode: "normal",
      hideScroll: false,
    }),
}));

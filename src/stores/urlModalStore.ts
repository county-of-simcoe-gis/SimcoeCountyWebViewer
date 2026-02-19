import { create } from "zustand";

interface URLModalState {
  isOpen: boolean;
  url: string;
  title: string;
  open: (url: string, title?: string) => void;
  close: () => void;
}

export const useURLModalStore = create<URLModalState>((set) => ({
  isOpen: false,
  url: "",
  title: "Information",
  open: (url, title = "Information") => set({ isOpen: true, url, title }),
  close: () => set({ isOpen: false, url: "", title: "Information" }),
}));

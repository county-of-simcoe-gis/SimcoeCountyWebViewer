import { create } from "zustand";

interface HelpModalStore {
  isOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

export const useHelpModalStore = create<HelpModalStore>((set) => ({
  isOpen: false,
  openHelp: () => set({ isOpen: true }),
  closeHelp: () => set({ isOpen: false }),
}));

import { create } from "zustand";

export interface LegendEntry {
  height: number;
  width: number;
  contentType: string;
  imageData: string;
  label: string;
}

export interface LegendObject {
  legend: LegendEntry[];
}

interface LegendLayer {
  name: string;
  tocDisplayName: string;
  styleUrl?: string;
  imageUrl?: string;
  legendObj?: LegendObject;
  group: string;
  groupName: string;
}

interface LegendGroup {
  label: string;
  value: string;
  layers: LegendLayer[];
}

interface LegendStore {
  isOpen: boolean;
  allGroups: LegendGroup[]; // All available groups
  selectedGroups: LegendGroup[]; // Currently selected groups to display
  openLegend: (allGroups: LegendGroup[], selectedGroups?: LegendGroup[]) => void;
  closeLegend: () => void;
  setSelectedGroups: (groups: LegendGroup[]) => void;
}

export const useLegendStore = create<LegendStore>((set) => ({
  isOpen: false,
  allGroups: [],
  selectedGroups: [],
  openLegend: (allGroups, selectedGroups) =>
    set({
      isOpen: true,
      allGroups,
      selectedGroups: selectedGroups || allGroups,
    }),
  closeLegend: () => set({ isOpen: false, allGroups: [], selectedGroups: [] }),
  setSelectedGroups: (groups) => set({ selectedGroups: groups }),
}));

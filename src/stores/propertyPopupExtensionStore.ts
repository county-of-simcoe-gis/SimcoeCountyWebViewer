import { create } from "zustand";
import type { ReactNode } from "react";

/**
 * Extension item that adds content to the PropertyPopup.
 * Secure themes register items here to inject rows (e.g., MPac/Teranet report links).
 */
export interface PropertyPopupExtensionItem {
  /** Unique identifier for this extension item */
  id: string;
  /** Display label used as InfoRow label */
  label: string;
  /** Group name for ordering/categorization */
  group?: string;
  /** Sort order within the popup (lower = higher) */
  order: number;
  /**
   * Render function called with the current property's ARN and optional OL Feature.
   * Returns the ReactNode content to display in the InfoRow value area.
   */
  render: (arn: string) => ReactNode;
  /**
   * Visibility check — called each time the popup renders.
   * Return false to hide this extension item.
   */
  isVisible?: () => boolean;
}

interface PropertyPopupExtensionState {
  items: PropertyPopupExtensionItem[];
  registerItems: (items: PropertyPopupExtensionItem[]) => void;
  unregisterItems: (ids: string[]) => void;
  getVisibleItems: () => PropertyPopupExtensionItem[];
  clearAll: () => void;
}

export const usePropertyPopupExtensionStore = create<PropertyPopupExtensionState>((set, get) => ({
  items: [],

  registerItems: (newItems) => {
    set((state) => {
      // Filter out duplicates
      const existingIds = new Set(state.items.map((i) => i.id));
      const uniqueNewItems = newItems.filter((i) => !existingIds.has(i.id));
      return { items: [...state.items, ...uniqueNewItems] };
    });
  },

  unregisterItems: (ids) => {
    set((state) => ({
      items: state.items.filter((i) => !ids.includes(i.id)),
    }));
  },

  getVisibleItems: () => {
    return get()
      .items.filter((item) => !item.isVisible || item.isVisible())
      .sort((a, b) => a.order - b.order);
  },

  clearAll: () => {
    set({ items: [] });
  },
}));

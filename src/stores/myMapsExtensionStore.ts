import { create } from "zustand";
import type { ReactNode } from "react";
import type { MyMapsItem } from "@/stores/myMapsStore";

/**
 * A registered context menu extension item for the MyMaps popup.
 * Themes can register additional context menu items
 * that appear when a user right-clicks a MyMaps drawing.
 */
export interface MyMapsExtensionItem {
  /** Unique key for this menu item */
  id: string;
  /** Display label in the menu */
  label: string;
  /** Optional icon — a React node (e.g. react-icons component) */
  icon?: ReactNode;
  /** Group/submenu this item belongs to (rendered as a submenu header) */
  group?: string;
  /** Sort order within the group (lower = higher in list) */
  order?: number;
  /**
   * Callback when the menu item is clicked.
   * Receives the MyMapsItem so the extension can access its geometry, id, etc.
   */
  onClick: (item: MyMapsItem) => void;
  /**
   * Optional visibility check called each render.
   * If it returns false, the item is hidden.
   * Use this to conditionally show items based on theme state, roles, etc.
   */
  isVisible?: () => boolean;
}

interface MyMapsExtensionState {
  /** All registered extension menu items keyed by id */
  items: Map<string, MyMapsExtensionItem>;

  /** Register one or more extension items */
  registerItems: (items: MyMapsExtensionItem[]) => void;

  /** Unregister items by their ids */
  unregisterItems: (ids: string[]) => void;

  /** Get all visible items, grouped by their group name */
  getVisibleItems: () => MyMapsExtensionItem[];

  /** Clear all registered items */
  clearAll: () => void;
}

export const useMyMapsExtensionStore = create<MyMapsExtensionState>((set, get) => ({
  items: new Map(),

  registerItems: (newItems) => {
    set((state) => {
      const updated = new Map(state.items);
      newItems.forEach((item) => updated.set(item.id, item));
      return { items: updated };
    });
  },

  unregisterItems: (ids) => {
    set((state) => {
      const updated = new Map(state.items);
      ids.forEach((id) => updated.delete(id));
      return { items: updated };
    });
  },

  getVisibleItems: () => {
    const { items } = get();
    return Array.from(items.values())
      .filter((item) => !item.isVisible || item.isVisible())
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  },

  clearAll: () => set({ items: new Map() }),
}));

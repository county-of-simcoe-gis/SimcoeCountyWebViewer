"use client";

import { create } from "zustand";
import type { MapBrowserEvent } from "ol";
import type { Result } from "@/components/ResultsPopup";

// Event types that can be handled
export type InteractionEventType = "singleclick" | "contextmenu" | "pointermove" | "dblclick";

// InteractionResult is an alias for Result for consistency
export type InteractionResult = Result;

// Conditions for when a handler should execute
export interface InteractionConditions {
  maxScale?: number; // Only execute below this scale (e.g., 20000)
  checkDisableFlags?: () => boolean; // Returns true if handler should be disabled
  checkLayerFilters?: (event: MapBrowserEvent<PointerEvent>) => boolean; // Returns true if handler should be disabled based on layers
}

// Handler definition
export interface InteractionHandler {
  id: string;
  eventType: InteractionEventType;
  priority?: number; // Lower number = higher priority (runs first). Default is 100
  conditions?: InteractionConditions;
  handler: (coordinate: number[], pixel: number[], event: MapBrowserEvent<PointerEvent>) => Promise<InteractionResult[]> | InteractionResult[] | Promise<void> | void;
}

interface InteractionManagerState {
  handlers: InteractionHandler[];
  registerHandler: (handler: InteractionHandler) => void;
  unregisterHandler: (handlerId: string) => void;
  getHandlers: (eventType?: InteractionEventType) => InteractionHandler[];
}

export const useInteractionManagerStore = create<InteractionManagerState>((set, get) => ({
  handlers: [],

  registerHandler: (handler: InteractionHandler) => {
    set((state) => {
      // Remove existing handler with same ID if it exists
      const filteredHandlers = state.handlers.filter((h) => h.id !== handler.id);
      // Add new handler and sort by priority
      const newHandlers = [...filteredHandlers, { ...handler, priority: handler.priority ?? 100 }];
      newHandlers.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
      console.log(`InteractionManagerStore: Registered handler "${handler.id}", total handlers: ${newHandlers.length}`);
      return { handlers: newHandlers };
    });
  },

  unregisterHandler: (handlerId: string) => {
    set((state) => {
      const newHandlers = state.handlers.filter((h) => h.id !== handlerId);
      console.log(`InteractionManagerStore: Unregistered handler "${handlerId}", total handlers: ${newHandlers.length}`);
      return { handlers: newHandlers };
    });
  },

  getHandlers: (eventType?: InteractionEventType) => {
    const { handlers } = get();
    if (eventType) {
      return handlers.filter((h) => h.eventType === eventType);
    }
    return handlers;
  },
}));

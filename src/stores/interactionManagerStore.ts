"use client";

import { create } from "zustand";
import type { MapBrowserEvent } from "ol";
import type { Interaction } from "ol/interaction";
import type { Result } from "@/components/ResultsPopup";
import { useMapStore } from "@/stores/mapStore";

// Event types that can be handled
export type InteractionEventType = "singleclick" | "contextmenu" | "pointermove" | "dblclick";

// InteractionResult is an alias for Result for consistency
export type InteractionResult = Result;

// Conditions for when a handler should execute
export interface InteractionConditions {
  /** Only execute when current zoom <= maxZoom */
  maxZoom?: number;
  /** Only execute when current zoom >= minZoom */
  minZoom?: number;
  /** Only execute below this scale (e.g., 20000) */
  maxScale?: number;
  /** Returns true if handler should be disabled */
  checkDisableFlags?: () => boolean;
  /** Returns true if handler should be disabled based on layers at the click pixel */
  checkLayerFilters?: (event: MapBrowserEvent<PointerEvent>) => boolean;
}

// Handler definition (for logical click/move/contextmenu callbacks)
export interface InteractionHandler {
  id: string;
  eventType: InteractionEventType;
  priority?: number; // Lower number = higher priority (runs first). Default is 100
  conditions?: InteractionConditions;
  handler: (coordinate: number[], pixel: number[], event: MapBrowserEvent<PointerEvent>) => Promise<InteractionResult[]> | InteractionResult[] | Promise<void> | void;
}

// Managed OL Interaction object (Draw, Modify, Translate, Snap, PinchRotate, DragRotate, etc.)
export interface ManagedInteraction {
  id: string;
  interaction: Interaction;
  owner: string; // Component/system that owns this interaction (e.g., "myMaps", "measure", "rotation")
}

interface InteractionManagerState {
  // Logical handler callbacks
  handlers: InteractionHandler[];
  registerHandler: (handler: InteractionHandler) => void;
  unregisterHandler: (handlerId: string) => void;
  getHandlers: (eventType?: InteractionEventType) => InteractionHandler[];

  // OL Interaction object management
  interactions: ManagedInteraction[];
  registerInteraction: (id: string, interaction: Interaction, owner?: string) => void;
  unregisterInteraction: (id: string) => void;
  getInteraction: (id: string) => ManagedInteraction | undefined;
  getInteractionsByOwner: (owner: string) => ManagedInteraction[];
  unregisterAllByOwner: (owner: string) => void;
}

export const useInteractionManagerStore = create<InteractionManagerState>((set, get) => ({
  handlers: [],
  interactions: [],

  // --- Logical handler callbacks ---

  registerHandler: (handler: InteractionHandler) => {
    set((state) => {
      // Remove existing handler with same ID if it exists
      const filteredHandlers = state.handlers.filter((h) => h.id !== handler.id);
      // Add new handler and sort by priority
      const newHandlers = [...filteredHandlers, { ...handler, priority: handler.priority ?? 100 }];
      newHandlers.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
      return { handlers: newHandlers };
    });
  },

  unregisterHandler: (handlerId: string) => {
    set((state) => {
      const newHandlers = state.handlers.filter((h) => h.id !== handlerId);
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

  // --- OL Interaction object management ---

  registerInteraction: (id: string, interaction: Interaction, owner: string = "unknown") => {
    const map = useMapStore.getState().map;

    // If an interaction with the same ID already exists, remove it first
    const existing = get().interactions.find((i) => i.id === id);
    if (existing) {
      if (map) {
        map.removeInteraction(existing.interaction);
      }
    }

    // Add to map
    if (map) {
      map.addInteraction(interaction);
    }

    set((state) => ({
      interactions: [...state.interactions.filter((i) => i.id !== id), { id, interaction, owner }],
    }));
  },

  unregisterInteraction: (id: string) => {
    const map = useMapStore.getState().map;
    const existing = get().interactions.find((i) => i.id === id);

    if (existing) {
      if (map) {
        map.removeInteraction(existing.interaction);
      }
      set((state) => ({
        interactions: state.interactions.filter((i) => i.id !== id),
      }));
    }
  },

  getInteraction: (id: string) => {
    return get().interactions.find((i) => i.id === id);
  },

  getInteractionsByOwner: (owner: string) => {
    return get().interactions.filter((i) => i.owner === owner);
  },

  unregisterAllByOwner: (owner: string) => {
    const map = useMapStore.getState().map;
    const toRemove = get().interactions.filter((i) => i.owner === owner);

    toRemove.forEach((managed) => {
      if (map) {
        map.removeInteraction(managed.interaction);
      }
    });

    set((state) => ({
      interactions: state.interactions.filter((i) => i.owner !== owner),
    }));
  },
}));

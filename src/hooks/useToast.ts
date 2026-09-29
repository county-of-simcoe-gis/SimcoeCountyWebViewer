/**
 * Lightweight Toast Notification System using DaisyUI
 * 
 * Modern alternative to react-toastify that integrates with DaisyUI styling.
 * Provides success, error, info, and warning notifications with auto-dismiss.
 */

import { create } from 'zustand';
import { useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// ============================================================================
// Toast Store
// ============================================================================

const DEFAULT_DURATION = 5000; // 5 seconds

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType, duration = DEFAULT_DURATION): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// ============================================================================
// Toast Helper Hook
// ============================================================================

/**
 * Hook for showing toast notifications
 * 
 * @example
 * ```tsx
 * const toast = useToast();
 * 
 * // Show different types of toasts
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 * toast.info('Did you know?');
 * toast.warning('Be careful!');
 * 
 * // Custom duration (ms)
 * toast.success('Quick message', 2000);
 * ```
 */
export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const clearAll = useToastStore((state) => state.clearAll);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    /**
     * Show a success toast (green)
     */
    success: (message: string, duration?: number) => 
      addToast(message, 'success', duration),

    /**
     * Show an error toast (red)
     */
    error: (message: string, duration?: number) => 
      addToast(message, 'error', duration),

    /**
     * Show an info toast (blue)
     */
    info: (message: string, duration?: number) => 
      addToast(message, 'info', duration),

    /**
     * Show a warning toast (yellow/orange)
     */
    warning: (message: string, duration?: number) => 
      addToast(message, 'warning', duration),

    /**
     * Remove a specific toast by ID
     */
    dismiss: removeToast,

    /**
     * Clear all toasts
     */
    clearAll,
  }), [addToast, removeToast, clearAll]);
}

export default useToast;

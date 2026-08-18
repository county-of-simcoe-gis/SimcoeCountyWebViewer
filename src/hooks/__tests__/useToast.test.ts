import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "@/hooks/useToast";

describe("useToastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with empty toasts", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("addToast creates a toast and returns its id", () => {
    const id = useToastStore.getState().addToast("Hello", "success");
    expect(id).toBeTruthy();
    expect(useToastStore.getState().toasts).toHaveLength(1);
    const toast = useToastStore.getState().toasts[0];
    expect(toast.message).toBe("Hello");
    expect(toast.type).toBe("success");
    expect(toast.id).toBe(id);
  });

  it("addToast supports all toast types", () => {
    useToastStore.getState().addToast("s", "success");
    useToastStore.getState().addToast("e", "error");
    useToastStore.getState().addToast("i", "info");
    useToastStore.getState().addToast("w", "warning");
    const types = useToastStore.getState().toasts.map((t) => t.type);
    expect(types).toEqual(["success", "error", "info", "warning"]);
  });

  it("addToast auto-removes after duration", () => {
    useToastStore.getState().addToast("Temp", "info", 3000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("addToast with duration 0 does not auto-remove", () => {
    useToastStore.getState().addToast("Persistent", "info", 0);
    vi.advanceTimersByTime(60000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("addToast uses default duration of 5000ms", () => {
    useToastStore.getState().addToast("Default", "success");
    vi.advanceTimersByTime(4999);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("removeToast removes specific toast by id", () => {
    const id1 = useToastStore.getState().addToast("First", "success", 0);
    useToastStore.getState().addToast("Second", "error", 0);
    useToastStore.getState().removeToast(id1);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Second");
  });

  it("clearAll removes all toasts", () => {
    useToastStore.getState().addToast("A", "success", 0);
    useToastStore.getState().addToast("B", "error", 0);
    useToastStore.getState().clearAll();
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});

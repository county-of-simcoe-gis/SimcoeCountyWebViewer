import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ToastContainer } from "@/components/Toast/ToastContainer";
import { useToastStore } from "@/hooks/useToast";

describe("ToastContainer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toast messages from the store", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", message: "Success!", type: "success", duration: 5000, createdAt: Date.now() },
        { id: "2", message: "Error!", type: "error", duration: 5000, createdAt: Date.now() },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("renders correct alert classes for each toast type", () => {
    useToastStore.setState({
      toasts: [
        { id: "s", message: "S", type: "success", duration: 5000, createdAt: Date.now() },
        { id: "e", message: "E", type: "error", duration: 5000, createdAt: Date.now() },
        { id: "i", message: "I", type: "info", duration: 5000, createdAt: Date.now() },
        { id: "w", message: "W", type: "warning", duration: 5000, createdAt: Date.now() },
      ],
    });
    render(<ToastContainer />);
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(4);
    expect(alerts[0].className).toContain("alert-success");
    expect(alerts[1].className).toContain("alert-error");
    expect(alerts[2].className).toContain("alert-info");
    expect(alerts[3].className).toContain("alert-warning");
  });

  it("dismiss button triggers exit animation and removes toast", () => {
    useToastStore.setState({
      toasts: [{ id: "1", message: "Dismiss me", type: "info", duration: 0, createdAt: Date.now() }],
    });
    render(<ToastContainer />);
    const dismissBtn = screen.getByLabelText("Dismiss notification");
    fireEvent.click(dismissBtn);

    // After animation delay (200ms), toast should be removed from store
    vi.advanceTimersByTime(200);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("has the correct container aria attributes", () => {
    useToastStore.setState({
      toasts: [{ id: "1", message: "Msg", type: "success", duration: 5000, createdAt: Date.now() }],
    });
    render(<ToastContainer />);
    const container = screen.getByLabelText("Notifications");
    expect(container).toHaveAttribute("aria-live", "polite");
  });
});

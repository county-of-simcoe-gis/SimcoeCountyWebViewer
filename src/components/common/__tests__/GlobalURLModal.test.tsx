import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GlobalURLModal from "@/components/common/GlobalURLModal";
import { useURLModalStore } from "@/stores/urlModalStore";

// Mock storage util
vi.mock("@/utils/storage", () => ({
  appendSharedArrayItem: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useURLModalStore.setState({
    isOpen: false,
    url: "",
    title: "Information",
    showFooter: false,
    honorDontShow: false,
    mode: "normal",
    hideScroll: false,
  });
});

describe("GlobalURLModal", () => {
  describe("Rendering", () => {
    it("renders nothing when not open", () => {
      const { container } = render(<GlobalURLModal />);
      expect(container.innerHTML).toBe("");
    });

    it("renders modal when open", () => {
      useURLModalStore.getState().open("https://example.com", "Test Title");
      render(<GlobalURLModal />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByTitle("Close")).toBeInTheDocument();
      expect(screen.getByTitle("Open in New Window")).toBeInTheDocument();
    });

    it("renders iframe with correct URL", () => {
      useURLModalStore.getState().open("https://example.com/page", "Page");
      render(<GlobalURLModal />);

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      expect(iframe).toBeTruthy();
      expect(iframe.src).toBe("https://example.com/page");
    });
  });

  describe("Footer", () => {
    it("does not show footer by default", () => {
      useURLModalStore.getState().open("https://example.com");
      render(<GlobalURLModal />);

      expect(screen.queryByText("Close Window")).not.toBeInTheDocument();
      expect(screen.queryByText(/Don.t Show/)).not.toBeInTheDocument();
    });

    it("shows footer when showFooter is true", () => {
      useURLModalStore.getState().open("https://example.com", "Info", { showFooter: true });
      render(<GlobalURLModal />);

      expect(screen.getByText("Close Window")).toBeInTheDocument();
      expect(screen.getByText(/Don.t Show this Again/)).toBeInTheDocument();
    });

    it("calls close when footer Close Window button is clicked", () => {
      useURLModalStore.getState().open("https://example.com", "Info", { showFooter: true });
      render(<GlobalURLModal />);

      fireEvent.click(screen.getByText("Close Window"));
      expect(useURLModalStore.getState().isOpen).toBe(false);
    });

    it("saves to storage and closes when Don't Show Again is clicked", async () => {
      const { appendSharedArrayItem } = await import("@/utils/storage");
      useURLModalStore.getState().open("https://example.com", "Info", { showFooter: true });
      render(<GlobalURLModal />);

      fireEvent.click(screen.getByText(/Don.t Show this Again/));
      expect(appendSharedArrayItem).toHaveBeenCalledWith("sc_dontshowagain", expect.objectContaining({ url: "https://example.com" }));
      expect(useURLModalStore.getState().isOpen).toBe(false);
    });
  });

  describe("Close Behavior", () => {
    it("closes on close button click", () => {
      useURLModalStore.getState().open("https://example.com");
      render(<GlobalURLModal />);

      fireEvent.click(screen.getByTitle("Close"));
      expect(useURLModalStore.getState().isOpen).toBe(false);
    });

    it("closes on Escape key", () => {
      useURLModalStore.getState().open("https://example.com");
      render(<GlobalURLModal />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(useURLModalStore.getState().isOpen).toBe(false);
    });
  });

  describe("Popout", () => {
    it("opens URL in new window and closes modal", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      useURLModalStore.getState().open("https://example.com/help");
      render(<GlobalURLModal />);

      fireEvent.click(screen.getByTitle("Open in New Window"));

      expect(openSpy).toHaveBeenCalledWith("https://example.com/help", "_blank");
      expect(useURLModalStore.getState().isOpen).toBe(false);
    });
  });

  describe("Loading state", () => {
    it("shows loading spinner before iframe loads", () => {
      useURLModalStore.getState().open("https://example.com");
      render(<GlobalURLModal />);

      // Loading spinner should be present (spinner uses 'loading' class)
      const spinner = document.querySelector(".loading-spinner");
      expect(spinner).toBeTruthy();
    });

    it("hides loading spinner after iframe loads", () => {
      useURLModalStore.getState().open("https://example.com");
      render(<GlobalURLModal />);

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      fireEvent.load(iframe);

      const spinner = document.querySelector(".loading-spinner");
      expect(spinner).toBeFalsy();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HelpModal from "@/components/HelpModal";
import { useHelpModalStore } from "@/stores/helpModalStore";

// Mock react-markdown since it's an ESM module that doesn't play well with JSDOM
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => {
    return <div data-testid="markdown-content">{children}</div>;
  },
}));

vi.mock("remark-gfm", () => ({
  default: () => {},
}));

// Helper to create a mock fetch function and install it
const mockFetch = (responses: Array<{ ok: boolean; status?: number; text?: string } | "reject">) => {
  let callIndex = 0;
  const fn = vi.fn(async () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    if (response === "reject") {
      throw new Error("Network error");
    }
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      text: async () => response.text ?? "",
    } as Response;
  });
  global.fetch = fn;
  return fn;
};

beforeEach(() => {
  vi.clearAllMocks();
  useHelpModalStore.setState({ isOpen: false });
  document.body.style.overflow = "";
  // Reset fetch to a no-op mock
  global.fetch = vi.fn(async () => ({ ok: true, text: async () => "" }) as Response);
});

describe("HelpModal", () => {
  describe("Rendering", () => {
    it("renders nothing when not open", () => {
      const { container } = render(<HelpModal />);
      expect(container.innerHTML).toBe("");
    });

    it("renders modal when open with content already loaded", async () => {
      mockFetch([{ ok: true, text: "# Help Content\n\nSome help text" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByText("Help")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Close help")).toBeInTheDocument();
    });

    it("renders Help heading in the modal header", async () => {
      mockFetch([{ ok: true, text: "# Test" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByText("Help")).toBeInTheDocument();
      });
    });
  });

  describe("Content Loading", () => {
    it("fetches README.md when modal opens", async () => {
      const fetchFn = mockFetch([{ ok: true, text: "# README Content" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });

      // Verify it fetches README.md with cache-busting param
      const fetchCall = fetchFn.mock.calls[0][0] as string;
      expect(fetchCall).toMatch(/^\/README\.md\?t=\d+$/);
    });

    it("displays fetched markdown content", async () => {
      mockFetch([{ ok: true, text: "# Hello World\n\nTest content here" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });

      expect(screen.getByTestId("markdown-content").textContent).toContain("Hello World");
    });

    it("displays error message on fetch failure", async () => {
      mockFetch([{ ok: false, status: 404 }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });

      expect(screen.getByTestId("markdown-content").textContent).toContain("Error loading help content");
    });

    it("displays error message on network failure", async () => {
      mockFetch(["reject"]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });

      expect(screen.getByTestId("markdown-content").textContent).toContain("Error loading help content");
    });

    it("shows loading spinner while fetching", async () => {
      // Create a promise we can control
      let resolvePromise: (value: Response) => void;
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn(() => pendingPromise);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      // Should show loading spinner
      const spinner = document.querySelector(".loading-spinner");
      expect(spinner).toBeTruthy();

      // Resolve to clean up
      resolvePromise!({
        ok: true,
        text: async () => "done",
      } as Response);

      await waitFor(() => {
        expect(document.querySelector(".loading-spinner")).toBeFalsy();
      });
    });

    it("does not re-fetch when modal stays mounted and is reopened", async () => {
      const fetchFn = mockFetch([{ ok: true, text: "# Cached Content" }]);

      useHelpModalStore.getState().openHelp();
      const { rerender } = render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Close and reopen without unmounting
      useHelpModalStore.getState().closeHelp();
      rerender(<HelpModal />);
      useHelpModalStore.getState().openHelp();
      rerender(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });

      // Still only 1 call — content was cached in component state
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Close Behavior", () => {
    it("closes on close button click", async () => {
      mockFetch([{ ok: true, text: "# Content" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByLabelText("Close help")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("Close help"));
      expect(useHelpModalStore.getState().isOpen).toBe(false);
    });

    it("closes on Escape key", async () => {
      mockFetch([{ ok: true, text: "# Content" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByText("Help")).toBeInTheDocument();
      });

      // Native <dialog> handles ESC → fires close event
      const dialog = document.querySelector("dialog") as HTMLDialogElement;
      dialog.close();
      expect(useHelpModalStore.getState().isOpen).toBe(false);
    });

    it("closes on overlay click", async () => {
      mockFetch([{ ok: true, text: "# Content" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByText("Help")).toBeInTheDocument();
      });

      // Click the backdrop (the form.modal-backdrop submit button)
      const backdrop = document.querySelector("form.modal-backdrop button") as HTMLElement;
      fireEvent.click(backdrop);
      expect(useHelpModalStore.getState().isOpen).toBe(false);
    });

    it("does not close when clicking inside the modal content", async () => {
      mockFetch([{ ok: true, text: "# Content" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      await waitFor(() => {
        expect(screen.getByText("Help")).toBeInTheDocument();
      });

      // Click the inner modal container (not the backdrop)
      const modalContent = screen.getByText("Help").closest(".modal-box") as HTMLElement;
      fireEvent.click(modalContent);
      expect(useHelpModalStore.getState().isOpen).toBe(true);
    });
  });

  describe("Body Scroll Lock", () => {
    it("prevents body scroll when modal is open", () => {
      mockFetch([{ ok: true, text: "# Content" }]);

      useHelpModalStore.getState().openHelp();
      render(<HelpModal />);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when modal closes", () => {
      mockFetch([{ ok: true, text: "# Content" }]);

      useHelpModalStore.getState().openHelp();
      const { unmount } = render(<HelpModal />);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });
});

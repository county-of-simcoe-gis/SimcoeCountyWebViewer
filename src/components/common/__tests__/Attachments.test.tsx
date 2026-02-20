import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Attachments from "@/components/common/Attachments";

// Sample attachment data matching ArcGIS attachment response
const mockAttachmentResponse = {
  attachmentGroups: [
    {
      attachmentInfos: [
        { url: "https://example.com/att/1", name: "photo.jpg", contentType: "image/jpeg", size: 1024 },
        { url: "https://example.com/att/2", name: "report.pdf", contentType: "application/pdf", size: 2048 },
        { url: "https://example.com/att/3", name: "diagram.png", contentType: "image/png", size: 512 },
      ],
    },
  ],
};

const emptyAttachmentResponse = {
  attachmentGroups: [],
};

describe("Attachments", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state initially", () => {
    // Never resolve the fetch
    fetchSpy.mockReturnValue(new Promise(() => {}));
    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    expect(screen.getByText("Loading attachments...")).toBeInTheDocument();
  });

  it("renders individual attachment items after fetch", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttachmentResponse),
    } as Response);

    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
      expect(screen.getByText("diagram.png")).toBeInTheDocument();
    });
  });

  it("renders nothing when no attachments are returned", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyAttachmentResponse),
    } as Response);

    const { container } = render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      // Loading should be gone
      expect(screen.queryByText("Loading attachments...")).not.toBeInTheDocument();
    });

    // Should render nothing (null)
    expect(container.querySelector(".flex")).toBeNull();
  });

  it("opens image attachments in a modal/dialog", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttachmentResponse),
    } as Response);

    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    // Click on an image attachment
    fireEvent.click(screen.getByText("photo.jpg"));

    // Should open the image preview dialog
    await waitFor(() => {
      expect(screen.getByText("Attachment Preview")).toBeInTheDocument();
      const img = screen.getByAltText("Attachment Preview");
      expect(img).toHaveAttribute("src", "https://example.com/att/1");
    });
  });

  it("opens non-image attachments in a new tab", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttachmentResponse),
    } as Response);

    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    // Click on a PDF attachment
    fireEvent.click(screen.getByText("report.pdf"));

    expect(windowOpenSpy).toHaveBeenCalledWith("https://example.com/att/2", "_blank");
  });

  it("appends token to attachment URLs when present", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttachmentResponse),
    } as Response);

    render(<Attachments attachmentUrl="https://example.com/attachments?f=json&token=abc123" />);

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    // Click on an image attachment - should have token appended
    fireEvent.click(screen.getByText("photo.jpg"));

    await waitFor(() => {
      const img = screen.getByAltText("Attachment Preview");
      expect(img).toHaveAttribute("src", "https://example.com/att/1?token=abc123");
    });
  });

  it("closes the image preview dialog when close button is clicked", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttachmentResponse),
    } as Response);

    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    // Open preview
    fireEvent.click(screen.getByText("photo.jpg"));
    await waitFor(() => {
      expect(screen.getByText("Attachment Preview")).toBeInTheDocument();
    });

    // Close preview
    fireEvent.click(screen.getByLabelText("Close preview"));

    await waitFor(() => {
      expect(screen.queryByText("Attachment Preview")).not.toBeInTheDocument();
    });
  });

  it("handles fetch errors gracefully", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      // Loading should be gone
      expect(screen.queryByText("Loading attachments...")).not.toBeInTheDocument();
    });

    // Should render nothing when fetch fails
    expect(container.querySelector(".flex.flex-col")).toBeNull();
    consoleSpy.mockRestore();
  });

  it("handles non-ok HTTP responses gracefully", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      expect(screen.queryByText("Loading attachments...")).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("supports keyboard activation on attachment items", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttachmentResponse),
    } as Response);

    render(<Attachments attachmentUrl="https://example.com/attachments?f=json" />);

    await waitFor(() => {
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    // Activate with Enter key
    fireEvent.keyDown(screen.getByText("report.pdf"), { key: "Enter" });

    expect(windowOpenSpy).toHaveBeenCalledWith("https://example.com/att/2", "_blank");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TOC from "@/components/TOC/TOC";
import { useAppStore } from "@/stores/appStore";
import { useTOCStore } from "@/stores/tocStore";

describe("TOC", () => {
  it("initializes from config and shows header controls", async () => {
    // Provide a minimal config
    useAppStore.setState({
      config: {
        toc: { tocType: "LIST", sources: [], helpLink: "", default_group: "" },
      } as any,
    } as any);

    render(<TOC visible />);

    await waitFor(() => {
      expect(useTOCStore.getState().tocType).toBe("LIST");
    });

    // Header search input exists
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });
});

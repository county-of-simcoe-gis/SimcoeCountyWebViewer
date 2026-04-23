import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CollapsiblePanel from "../CollapsiblePanel";

describe("CollapsiblePanel", () => {
  describe("Rendering", () => {
    it("renders title and children", () => {
      render(
        <CollapsiblePanel title="My Panel">
          <p>Body content</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible-title")).toHaveTextContent("My Panel");
      expect(screen.getByText("Body content")).toBeInTheDocument();
    });

    it("renders ReactNode titles", () => {
      render(
        <CollapsiblePanel title={<span data-testid="custom-title">Custom</span>}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("custom-title")).toBeInTheDocument();
    });

    it("applies the standardized card styling", () => {
      render(
        <CollapsiblePanel title="Panel">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const panel = screen.getByTestId("collapsible");
      expect(panel.className).toContain("collapse");
      expect(panel.className).toContain("collapse-arrow");
      expect(panel.className).toContain("bg-base-200");
      expect(panel.className).toContain("border");
      expect(panel.className).toContain("border-base-300");
      expect(panel.className).toContain("shadow-md");
      expect(panel.className).toContain("rounded-box");
      expect(panel.className).toContain("shrink-0");
    });

    it("applies custom className to the outer element", () => {
      render(
        <CollapsiblePanel title="Panel" className="flex-1 my-custom">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const panel = screen.getByTestId("collapsible");
      expect(panel.className).toContain("flex-1");
      expect(panel.className).toContain("my-custom");
    });

    it("applies custom titleClassName to the title", () => {
      render(
        <CollapsiblePanel title="Panel" titleClassName="custom-title-cls">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible-title").className).toContain("custom-title-cls");
    });

    it("uses a custom testId when provided", () => {
      render(
        <CollapsiblePanel title="Panel" testId="my-panel">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("my-panel")).toBeInTheDocument();
    });
  });

  describe("Uncontrolled mode", () => {
    it("defaults to open", () => {
      render(
        <CollapsiblePanel title="Panel">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const panel = screen.getByTestId("collapsible");
      expect(panel.className).toContain("collapse-open");
      expect(panel.className).not.toContain("collapse-close");
      expect(screen.getByTestId("collapsible-title")).toHaveAttribute("aria-expanded", "true");
    });

    it("respects defaultOpen={false}", () => {
      render(
        <CollapsiblePanel title="Panel" defaultOpen={false}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const panel = screen.getByTestId("collapsible");
      expect(panel.className).toContain("collapse-close");
      expect(panel.className).not.toContain("collapse-open");
      expect(screen.getByTestId("collapsible-title")).toHaveAttribute("aria-expanded", "false");
    });

    it("toggles state when the title is clicked", () => {
      render(
        <CollapsiblePanel title="Panel" defaultOpen={false}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const title = screen.getByTestId("collapsible-title");
      const panel = screen.getByTestId("collapsible");

      expect(panel.className).toContain("collapse-close");

      fireEvent.click(title);
      expect(panel.className).toContain("collapse-open");
      expect(title).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(title);
      expect(panel.className).toContain("collapse-close");
      expect(title).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Controlled mode", () => {
    it("reflects the `open` prop instead of internal state", () => {
      const { rerender } = render(
        <CollapsiblePanel title="Panel" open={false} onOpenChange={vi.fn()}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible").className).toContain("collapse-close");

      rerender(
        <CollapsiblePanel title="Panel" open={true} onOpenChange={vi.fn()}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible").className).toContain("collapse-open");
    });

    it("calls onOpenChange with the next value when clicked", () => {
      const onOpenChange = vi.fn();
      render(
        <CollapsiblePanel title="Panel" open={false} onOpenChange={onOpenChange}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      fireEvent.click(screen.getByTestId("collapsible-title"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it("does not change visible state without a prop update (controlled)", () => {
      const onOpenChange = vi.fn();
      render(
        <CollapsiblePanel title="Panel" open={false} onOpenChange={onOpenChange}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const panel = screen.getByTestId("collapsible");
      fireEvent.click(screen.getByTestId("collapsible-title"));
      // Parent didn't flip `open`, so the panel stays closed.
      expect(panel.className).toContain("collapse-close");
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it("ignores defaultOpen when controlled", () => {
      render(
        <CollapsiblePanel title="Panel" defaultOpen={true} open={false} onOpenChange={vi.fn()}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible").className).toContain("collapse-close");
    });
  });

  describe("Badge", () => {
    it("does not render a badge when none is provided", () => {
      render(
        <CollapsiblePanel title="Panel">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it("renders a numeric badge", () => {
      render(
        <CollapsiblePanel title="Panel" badge={42}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const badge = screen.getByText("42");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("badge");
    });

    it("renders badge={0}", () => {
      // Value 0 must render — common for count badges.
      render(
        <CollapsiblePanel title="Panel" badge={0}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("does not render when badge is null or undefined", () => {
      const { rerender } = render(
        <CollapsiblePanel title="Panel" badge={null}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible-title").querySelector(".badge")).toBeNull();

      rerender(
        <CollapsiblePanel title="Panel" badge={undefined}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      expect(screen.getByTestId("collapsible-title").querySelector(".badge")).toBeNull();
    });
  });

  describe("Content padding behavior", () => {
    it("applies contentClassName when open", () => {
      render(
        <CollapsiblePanel title="Panel" defaultOpen={true} contentClassName="px-2 pb-2">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const content = screen.getByTestId("collapsible-content");
      expect(content.className).toContain("px-2");
      expect(content.className).toContain("pb-2");
    });

    it("omits contentClassName when closed so padding does not break header alignment", () => {
      render(
        <CollapsiblePanel title="Panel" defaultOpen={false} contentClassName="px-2 pb-2">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const content = screen.getByTestId("collapsible-content");
      expect(content.className).not.toContain("px-2");
      expect(content.className).not.toContain("pb-2");
      expect(content.className).toContain("collapse-content");
    });
  });

  describe("Accessibility", () => {
    it("exposes an aria-expanded state on the title", () => {
      render(
        <CollapsiblePanel title="Panel">
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const title = screen.getByTestId("collapsible-title");
      expect(title).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(title);
      expect(title).toHaveAttribute("aria-expanded", "false");
    });

    it("renders a hidden trigger checkbox that mirrors open state", () => {
      render(
        <CollapsiblePanel title="Panel" defaultOpen={true}>
          <p>Body</p>
        </CollapsiblePanel>,
      );
      const trigger = screen.getByTestId("collapsible-trigger") as HTMLInputElement;
      expect(trigger.type).toBe("checkbox");
      expect(trigger.checked).toBe(true);
      expect(trigger.className).toContain("hidden");
      expect(trigger).toHaveAttribute("aria-hidden", "true");
    });
  });
});

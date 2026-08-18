"use client";

import React, { useState, type ReactNode } from "react";

export interface CollapsiblePanelProps {
  /** Title shown in the clickable header. */
  title: ReactNode;
  /** Panel body. */
  children: ReactNode;
  /** Initial open state when the panel is uncontrolled. Defaults to `true`. */
  defaultOpen?: boolean;
  /** Controlled open state. When provided, the panel is controlled by the parent. */
  open?: boolean;
  /** Called when the user toggles the panel. Required for controlled mode. */
  onOpenChange?: (open: boolean) => void;
  /** Optional badge rendered next to the title (e.g. a count). */
  badge?: ReactNode;
  /** Extra classes for the outer `collapse` element. */
  className?: string;
  /** Extra classes for the header (`collapse-title`). */
  titleClassName?: string;
  /** Extra classes for the body (`collapse-content`). */
  contentClassName?: string;
  /** Optional test id override (default `"collapsible"`). */
  testId?: string;
}

/**
 * Shared DaisyUI-based collapsible panel with consistent "card" styling
 * (light grey background, border, drop shadow). Supports both controlled
 * (`open` + `onOpenChange`) and uncontrolled (`defaultOpen`) usage.
 */
export default function CollapsiblePanel({
  title,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  badge,
  className = "",
  titleClassName = "",
  contentClassName = "",
  testId = "collapsible",
}: CollapsiblePanelProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);
  const isOpen = isControlled ? (open as boolean) : internalOpen;
  const hasBadge = badge !== undefined && badge !== null;

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div
      // `shrink-0` is a no-op outside flex containers, but prevents DaisyUI's
      // grid-based collapse from being compressed when placed inside a
      // `flex flex-col` parent (default `flex-shrink: 1` would collapse the
      // 1fr content row to 0 and show only the ~30px title).
      className={`collapse collapse-arrow bg-base-200 border border-base-300 shadow-md rounded-box shrink-0 ${isOpen ? "collapse-open" : "collapse-close"} ${className}`.trim()}
      tabIndex={0}
      data-testid={testId}
    >
      {/* Hidden checkbox kept for DaisyUI CSS hooks; state is driven by collapse-open/collapse-close classes. */}
      <input type="checkbox" checked={isOpen} readOnly className="hidden" aria-hidden="true" tabIndex={-1} data-testid="collapsible-trigger" />
      <div className={`collapse-title text-sm font-semibold cursor-pointer ${titleClassName}`.trim()} onClick={toggle} data-testid="collapsible-title" aria-expanded={isOpen}>
        {title}
        {hasBadge && <span className="badge badge-sm badge-ghost absolute right-8 top-1/2 -translate-y-1/2">{badge}</span>}
      </div>
      <div className={`collapse-content ${isOpen ? contentClassName : ""}`.trim()} data-testid="collapsible-content">
        {children}
      </div>
    </div>
  );
}

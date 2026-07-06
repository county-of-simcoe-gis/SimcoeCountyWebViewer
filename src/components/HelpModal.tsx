"use client";

import React, { useEffect, useState, useCallback } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaTimes } from "react-icons/fa";
import { useHelpModalStore } from "@/stores/helpModalStore";
import { resolveImageSrc } from "@/components/shared/AppImage";
import { Modal } from "@/components/ui/Modal";

/**
 * HelpModal Component
 * Modal overlay that fetches and renders README.md as styled help documentation
 */
export default function HelpModal() {
  const isOpen = useHelpModalStore((s) => s.isOpen);
  const closeHelp = useHelpModalStore((s) => s.closeHelp);
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchReadmeContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/README.md?t=${timestamp}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch README.md: ${response.status}`);
      }

      const text = await response.text();
      setContent(text);
    } catch (error) {
      console.error("Error fetching README.md:", error);
      setContent("Error loading help content. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch content when modal opens
  useEffect(() => {
    if (isOpen && !content) {
      fetchReadmeContent();
    }
  }, [isOpen, content, fetchReadmeContent]);

  if (!isOpen) {
    return null;
  }

  // Helper to convert heading text to URL-friendly ID for anchor links
  const createId = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Custom heading components with proper IDs for anchor navigation
  const HeadingComponent = (level: number) => {
    const component: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, ...props }) => {
      const text = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : "";
      const id = createId(text);
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

      return React.createElement(Tag, { id, ...props }, children);
    };

    component.displayName = `Heading${level}`;
    return component;
  };

  // Custom image component to handle relative paths
  const ImageComponent = ({ src, alt, node: _node, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) => {
    if (!src || typeof src !== "string") return <img alt={alt} {...props} />;

    const imageSrc = resolveImageSrc(src.startsWith("/") ? src : `/${src}`);

    return <img src={imageSrc} alt={alt} {...props} />;
  };

  // Custom link component — external links open in new tab
  const LinkComponent = ({ href, children, node: _node, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => {
    if (!href) return <a {...props}>{children}</a>;

    if (href.startsWith("#")) {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  };

  const markdownComponents: Partial<Components> = {
    a: LinkComponent as Components["a"],
    img: ImageComponent as Components["img"],
    h1: HeadingComponent(1) as Components["h1"],
    h2: HeadingComponent(2) as Components["h2"],
    h3: HeadingComponent(3) as Components["h3"],
    h4: HeadingComponent(4) as Components["h4"],
    h5: HeadingComponent(5) as Components["h5"],
    h6: HeadingComponent(6) as Components["h6"],
  };

  return (
    <Modal isOpen={isOpen} onClose={closeHelp} className="max-w-[95vw] max-h-[95vh] p-0 flex flex-col overflow-hidden" portalTarget="body">
      <div className="flex justify-between items-center px-5 py-4 border-b border-base-300 bg-base-200 shrink-0">
        <h3 className="m-0 text-lg font-semibold text-base-content max-w-[calc(100%-40px)] overflow-hidden text-ellipsis whitespace-nowrap">Help</h3>
        <button className="btn btn-sm btn-ghost btn-circle text-2xl" onClick={closeHelp} title="Close" type="button" aria-label="Close help">
          <FaTimes />
        </button>
      </div>

      <div className="flex-1 relative overflow-y-auto bg-base-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-base-content/60">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : (
          <div className="prose prose-blue max-w-none bg-base-100 px-5 py-4 min-h-full">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </Modal>
  );
}

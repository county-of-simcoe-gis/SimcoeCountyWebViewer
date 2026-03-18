"use client";

import React, { useEffect, useState, useCallback } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaTimes, FaSync } from "react-icons/fa";
import { useHelpModalStore } from "@/stores/helpModalStore";
import { getPublicPath } from "@/utils/getPublicPath";
import { Modal } from "@/components/ui/Modal";

/**
 * HelpModal Component
 * Modal overlay that fetches and renders README.md as styled help documentation
 */
export default function HelpModal() {
  const { isOpen, closeHelp } = useHelpModalStore();
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
  const ImageComponent: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, alt, ...props }) => {
    if (!src || typeof src !== "string") return <img alt={alt} {...props} />; // eslint-disable-line @next/next/no-img-element

    const isRelativePath = !src.startsWith("http") && !src.startsWith("data:");
    const imageSrc = isRelativePath ? getPublicPath(`/${src.replace(/^\//, "")}`) : src;

    return <img src={imageSrc} alt={alt} {...props} />; // eslint-disable-line @next/next/no-img-element
  };

  // Custom link component — external links open in new tab
  const LinkComponent: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, children, ...props }) => {
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
    <Modal isOpen={isOpen} onClose={closeHelp} className="max-w-[900px] w-full max-h-[90vh] overflow-y-auto p-0 flex flex-col animate-slideUp" portalTarget="body">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-800 m-0">Help</h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm btn-ghost flex items-center gap-1" onClick={fetchReadmeContent} disabled={isLoading} title="Refresh content">
            <FaSync className={isLoading ? "animate-spin" : ""} size={14} />
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-800 text-white border-none w-8 h-8 rounded-full flex items-center justify-center text-base cursor-pointer transition-all duration-200 p-0 hover:scale-110 active:scale-95 shadow-lg"
            onClick={closeHelp}
            aria-label="Close help"
            title="Close (ESC)"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : (
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </Modal>
  );
}

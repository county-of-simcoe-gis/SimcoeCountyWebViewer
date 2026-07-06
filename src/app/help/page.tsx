"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveImageSrc } from "@/components/shared/AppImage";

export default function HelpPage() {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
    };
  }, []);

  useEffect(() => {
    const loadReadme = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const response = await fetch(`${basePath}/README.md?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to fetch README.md: ${response.status}`);
        setContent(await response.text());
      } catch {
        setContent("# Help\n\nError loading help content. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadReadme();
  }, []);

  useEffect(() => {
    const updateHash = () => setActiveHash(window.location.hash.replace(/^#/, ""));
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    if (isLoading || !activeHash) return;

    const scrollToAnchor = () => {
      const target = document.getElementById(activeHash);
      if (!target) return false;

      target.scrollIntoView({ behavior: "auto", block: "start" });
      return true;
    };

    // The markdown headings render asynchronously, so retry a few frames
    // until the target heading exists in the DOM.
    let attempts = 0;
    let rafId = 0;

    const attemptScroll = () => {
      attempts += 1;
      if (scrollToAnchor() || attempts >= 10) return;
      rafId = window.requestAnimationFrame(attemptScroll);
    };

    rafId = window.requestAnimationFrame(attemptScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeHash, content, isLoading]);

  const createId = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

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

  const ImageComponent = ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!src || typeof src !== "string") return <img alt={alt} {...props} />;
    const imageSrc = resolveImageSrc(src.startsWith("/") ? src : `/${src}`);
    return <img src={imageSrc} alt={alt} {...props} />;
  };

  const LinkComponent = ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (!href) return <a {...props}>{children}</a>;
    if (href.startsWith("#")) {
      return (
        <a href={href} {...props} data-active-section={activeHash === href.slice(1) ? "true" : undefined}>
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
    <main className="min-h-screen overflow-y-auto bg-base-200 text-base-content">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 pb-10">
        <div className="rounded-t-lg border border-base-300 bg-base-100 px-5 py-4 shadow-sm">
          <h1 className="m-0 text-xl font-semibold">Help</h1>
          <p className="mt-1 mb-0 text-sm text-base-content/70">Documentation loaded from the application README.</p>
        </div>

        <div className="border-x border-b border-base-300 bg-base-100 px-5 py-4 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <article className="prose prose-blue max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </main>
  );
}

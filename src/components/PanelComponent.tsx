"use client";

import "@/components/PanelComponent.css";
import React, { useEffect } from "react";
import Image from "next/image";
import { FaQuestion, FaChevronLeft, FaTimes } from "react-icons/fa";
import { useSidebarStore } from "@/stores/sidebarStore";
import { showURLWindow } from "@/utils/helpersUI";

interface PanelComponentProps {
  name: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
  children: React.ReactNode;
  allowClick?: boolean;
}

export default function PanelComponent({ name, helpLink, hideHeader = false, onClose, onSidebarVisibility, children }: PanelComponentProps) {
  const { closeSidebar } = useSidebarStore();

  useEffect(() => {
    // TODO: Add event listener when we have proper event system
    return () => {
      // Cleanup event listener
    };
  }, []);

  const handleSidebarVisibility = () => {
    closeSidebar();
    if (onSidebarVisibility) {
      onSidebarVisibility();
    }
  };

  const handleHelpClick = () => {
    if (helpLink) {
      showURLWindow(helpLink, false);
    }
  };

  return (
    <div className="sc-panel-component">
      <div id="sc-panel-component-header" className={hideHeader ? "sc-hidden" : ""}>
        <div id="sc-panel-component-title">
          <div id="sc-panel-component-title-container">
            <div id="sc-panel-component-tool-icon">
              <Image src="/images/tools-icon.png" alt="Tool" width={24} height={24} />
            </div>
            <div id="sc-panel-component-tool-text" className={`sc-panel-component-tool-text${name.length < 25 ? "" : " small"}${helpLink ? " short" : ""}`} title={name}>
              {name}
            </div>

            <div id="sc-panel-component-tool-controls">
              <div id="sc-panel-component-help" className={`sc-panel-component-help ${helpLink ? "" : "sc-hidden"}`} title={`View Help for ${name}`} onClick={handleHelpClick}>
                <FaQuestion />
              </div>
              <button id="sc-panel-component-tool-img" title="Minimize Panel" aria-label="Minimize Panel" onClick={handleSidebarVisibility}>
                <FaChevronLeft size={14} />
              </button>
              <button id="sc-panel-component-tool-close" title={`Close ${name}`} aria-label={`Close ${name}`} onClick={onClose}>
                <FaTimes size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="sc-panel-component-content">{children}</div>
    </div>
  );
}

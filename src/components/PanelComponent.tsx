"use client";

import "./PanelComponent.css";
import React, { useEffect } from "react";
import { FaQuestion } from "react-icons/fa";
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
              <img src="/images/tools-icon.png" alt="Tool" />
            </div>
            <div id="sc-panel-component-tool-text" className={`sc-panel-component-tool-text${name.length < 25 ? "" : " small"}${helpLink ? " short" : ""}`} title={name}>
              {name}
            </div>

            <div id="sc-panel-component-tool-controls">
              <div id="sc-panel-component-help" className={`sc-panel-component-help ${helpLink ? "" : "sc-hidden"}`} title={`View Help for ${name}`} onClick={handleHelpClick}>
                <FaQuestion />
              </div>
              <img id="sc-panel-component-tool-img" src="/images/tab-close-24x24.png" alt="Minimize Panel" title="Minimize Panel" onClick={handleSidebarVisibility} />
              <img id="sc-panel-component-tool-close" src="/images/close-x-24x24.png" alt={`Close ${name}`} title={`Close ${name}`} onClick={onClose} />
            </div>
          </div>
        </div>
      </div>
      <div id="sc-panel-component-content">{children}</div>
    </div>
  );
}

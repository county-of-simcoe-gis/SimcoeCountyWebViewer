"use client";

import React, { useEffect } from "react";
import { FaChevronLeft, FaWrench } from "react-icons/fa";
import { useSidebarStore } from "@/stores/sidebarStore";
import { showURLWindow } from "@/utils/helpersUI";
import { PanelHeader } from "@/components/ui";

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
  icon?: React.ReactNode;
  controls?: React.ReactNode;
}

export default function PanelComponent({ name, helpLink, hideHeader = false, onClose, onSidebarVisibility, children, icon, controls }: PanelComponentProps) {
  const closeSidebar = useSidebarStore((s) => s.closeSidebar);

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
    <div className="w-full h-full min-h-0 overflow-hidden flex flex-col">
      {!hideHeader && (
        <PanelHeader
          title={name}
          icon={icon || <FaWrench size={20} className="text-neutral/70" />}
          onClose={onClose}
          onHelp={helpLink ? handleHelpClick : undefined}
          controls={
            <>
              {controls}
              <button
                className="border border-gray-300/70 p-1 rounded-sm ml-1.5 cursor-pointer inline-flex items-center justify-center align-top bg-base-300 w-6 h-6 text-gray-700"
                title="Minimize Panel"
                aria-label="Minimize Panel"
                onClick={handleSidebarVisibility}
              >
                <FaChevronLeft size={14} />
              </button>
            </>
          }
        />
      )}
      <div className="flex-1 min-h-0 box-border overflow-y-auto p-0.5">{children}</div>
    </div>
  );
}

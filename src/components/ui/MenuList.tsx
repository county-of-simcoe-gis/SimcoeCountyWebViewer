"use client";

import React from "react";

/* ─── MenuList ────────────────────────────────────────────────────────── */

export interface MenuListProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Replaces legacy .sc-menu-button-list-container and .map-context-menu-list.
 * A floating menu container for sidebar "More" menus and context menus.
 */
export const MenuList: React.FC<MenuListProps> = ({ children, className = "", style }) => {
  return (
    <ul
      style={style}
      className={`select-none bg-base-100 border border-base-300 rounded p-1.5 text-xs overflow-auto shadow-[2px_2px_5px_rgba(77,77,77,1)] text-left z-[100000] list-none m-0 ${className}`}
    >
      {children}
    </ul>
  );
};

/* ─── MenuItem ────────────────────────────────────────────────────────── */

export interface MenuItemProps {
  children: React.ReactNode;
  /** Optional icon element rendered before the label */
  icon?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Replaces legacy .sc-menu-list-item and .map-context-menu-item.
 */
export const MenuItem: React.FC<MenuItemProps> = ({ children, icon, disabled = false, onClick, className = "" }) => {
  return (
    <li
      onClick={disabled ? undefined : onClick}
      className={`p-1 cursor-pointer rounded-sm border border-transparent border-b-base-200 flex items-center gap-2 text-[10pt] select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#90b5d5] hover:bg-[image:var(--sc-gradient-hover)]"
      } ${className}`}
      role="menuitem"
      aria-disabled={disabled}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center text-neutral">{icon}</span>}
      <span className="flex-1 whitespace-nowrap">{children}</span>
    </li>
  );
};

/* ─── MenuHeading ─────────────────────────────────────────────────────── */

export interface MenuHeadingProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Replaces legacy .sc-menu-list-item-heading.
 */
export const MenuHeading: React.FC<MenuHeadingProps> = ({ children, className = "" }) => {
  return (
    <li className={`p-1 cursor-default border-b border-base-200 text-xs font-bold uppercase text-neutral pt-2.5 first:pt-0 [text-shadow:0.5px_0.5px_#e2e2e2] ${className}`} role="presentation">
      {children}
    </li>
  );
};

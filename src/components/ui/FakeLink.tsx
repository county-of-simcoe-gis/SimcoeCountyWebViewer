"use client";

import React from "react";

export interface FakeLinkProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Replaces legacy .sc-fakeLink CSS class.
 * Renders text styled as a clickable link without an anchor tag.
 */
export const FakeLink: React.FC<FakeLinkProps> = ({ children, className = "", ...props }) => {
  return (
    <span className={`text-[#337ab7] underline cursor-pointer select-none ${className}`} role="button" tabIndex={0} {...props}>
      {children}
    </span>
  );
};

"use client";

import React from "react";

export interface ToggleSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Label text shown next to the switch */
  label?: string;
  /** Position of label */
  labelPosition?: "left" | "right";
}

/**
 * Replaces legacy .sc-toggle-switch CSS class (custom checkbox with pseudo-element knob).
 * Uses DaisyUI toggle component.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, labelPosition = "right", className = "", ...props }) => {
  if (label) {
    return (
      <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
        {labelPosition === "left" && <span className="text-xs text-gray-600">{label}</span>}
        <input type="checkbox" className="toggle toggle-sm toggle-success" {...props} />
        {labelPosition === "right" && <span className="text-xs text-gray-600">{label}</span>}
      </label>
    );
  }

  return <input type="checkbox" className={`toggle toggle-sm toggle-success ${className}`} {...props} />;
};

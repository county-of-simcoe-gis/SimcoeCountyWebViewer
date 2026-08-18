"use client";

import { FaSun, FaMoon, FaLaptop } from "react-icons/fa";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 py-2 border-b border-base-300">
      <p className="text-sm font-medium text-base-content mb-2">Theme</p>
      <div className="flex flex-col space-y-2 w-full">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={theme === "light"} onChange={() => setTheme("light")} className="radio radio-sm radio-primary" />
          <FaSun className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-base-content">Light</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={theme === "dark"} onChange={() => setTheme("dark")} className="radio radio-sm radio-primary" />
          <FaMoon className="h-4 w-4 text-indigo-400" />
          <span className="text-sm text-base-content">Dark</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={theme === "system"} onChange={() => setTheme("system")} className="radio radio-sm radio-primary" />
          <FaLaptop className="h-4 w-4 text-base-content/60" />
          <span className="text-sm text-base-content">System</span>
        </label>
      </div>
    </div>
  );
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "@/utils/storage";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  effectiveTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  const getSystemTheme = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const storedTheme = getStorageItem("theme") as Theme | null;
    if (storedTheme && (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system")) {
      setTheme(storedTheme);
    }
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        setEffectiveTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Update effective theme based on theme setting
  useEffect(() => {
    if (theme === "system") {
      setEffectiveTheme(getSystemTheme());
    } else {
      setEffectiveTheme(theme as "light" | "dark");
    }

    setStorageItem("theme", theme);
  }, [theme]);

  // Update classes on the html element whenever effective theme changes
  useEffect(() => {
    const htmlElement = document.documentElement;

    // Set the dark class for Tailwind
    if (effectiveTheme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }

    // Set the data-theme attribute for DaisyUI
    htmlElement.setAttribute("data-theme", effectiveTheme === "dark" ? "dark" : "simcoe");
  }, [effectiveTheme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === "light") return "dark";
      if (prevTheme === "dark") return "system";
      return "light";
    });
  };

  return <ThemeContext.Provider value={{ theme, effectiveTheme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

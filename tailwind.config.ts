import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "[data-theme=dark]"],
  content: ["./src/app/**/*.{js,ts,jsx,tsx}", "./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(30px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        popupFadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        mymapsPopupFadeIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        submenuFadeIn: {
          from: { opacity: "0", transform: "translateX(-5px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        dropdownFadeIn: {
          from: { opacity: "0", transform: "translateY(-5px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-in",
        slideUp: "slideUp 0.3s ease-out",
        popupFadeIn: "popupFadeIn 0.2s ease-out",
        spin: "spin 1s linear infinite",
        mymapsPopupFadeIn: "mymapsPopupFadeIn 0.15s ease-out",
        submenuFadeIn: "submenuFadeIn 0.15s ease-out",
        dropdownFadeIn: "dropdownFadeIn 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

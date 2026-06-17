import { describe, it, expect } from "vitest";
import { JSONToSettings } from "@/lib/JSONTranslation";

describe("JSONTranslation", () => {
  describe("title mapping", () => {
    it("extracts title from root-level field", () => {
      const rawJson = {
        title: "Root Level Title",
        favicon: "favicon.ico",
      };

      const result = JSONToSettings(rawJson);
      expect(result.General?.title).toBe("Root Level Title");
    });

    it("extracts title from General section (sectioned payload)", () => {
      const rawJson = {
        General: {
          title: "General Section Title",
          favicon: "favicon.ico",
        },
      };

      const result = JSONToSettings(rawJson);
      expect(result.General?.title).toBe("General Section Title");
    });

    it("prefers General.title over root-level title", () => {
      const rawJson = {
        title: "Root Title",
        General: {
          title: "General Title",
          favicon: "favicon.ico",
        },
      };

      const result = JSONToSettings(rawJson);
      expect(result.General?.title).toBe("General Title");
    });

    it("falls back to name field when title is not provided", () => {
      const rawJson = {
        name: "Fallback Name",
        favicon: "favicon.ico",
      };

      const result = JSONToSettings(rawJson);
      expect(result.General?.title).toBe("Fallback Name");
    });

    it("prefers General.title over root-level name", () => {
      const rawJson = {
        name: "Root Name",
        General: {
          name: "General Name",
          favicon: "favicon.ico",
        },
      };

      const result = JSONToSettings(rawJson);
      expect(result.General?.title).toBe("General Name");
    });

    it("returns undefined when neither title nor name is provided", () => {
      const rawJson = {
        favicon: "favicon.ico",
      };

      const result = JSONToSettings(rawJson);
      expect(result.General?.title).toBeUndefined();
    });
  });
});

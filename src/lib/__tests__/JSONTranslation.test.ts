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

  describe("prototype pollution guards", () => {
    it("ignores __proto__ keys in the source payload", () => {
      const rawJson = JSON.parse('{"__proto__": {"polluted": "yes"}, "title": "Safe"}');

      const result = JSONToSettings(rawJson);

      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(false);
    });

    it("ignores constructor keys in the source payload", () => {
      const rawJson = JSON.parse('{"constructor": {"prototype": {"polluted": "yes"}}, "title": "Safe"}');

      JSONToSettings(rawJson);

      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});

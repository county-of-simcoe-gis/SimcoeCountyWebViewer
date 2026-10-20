import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveFolderColor } from "@/utils/tocHelpers";
import { DEFAULT_FOLDER_COLOR } from "@/stores/tocStore";

describe("resolveFolderColor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a 6-digit hex folderColor as-is", () => {
    expect(resolveFolderColor({ folderColor: "#1a2B3c" })).toBe("#1a2B3c");
  });

  it("returns a 3-digit hex folderColor as-is", () => {
    expect(resolveFolderColor({ folderColor: "#c00" })).toBe("#c00");
  });

  it("uses the legacy red color when useRedFolder is true and folderColor is unset", () => {
    expect(resolveFolderColor({ useRedFolder: true })).toBe("#cc0000");
  });

  it("returns the default color when nothing is set", () => {
    expect(resolveFolderColor({})).toBe(DEFAULT_FOLDER_COLOR);
  });

  it("prefers folderColor over the legacy useRedFolder flag", () => {
    expect(resolveFolderColor({ folderColor: "#123456", useRedFolder: true })).toBe("#123456");
  });

  it("warns and falls back for an invalid folderColor", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveFolderColor({ folderColor: "red" })).toBe(DEFAULT_FOLDER_COLOR);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to the legacy flag when folderColor is invalid", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveFolderColor({ folderColor: "#12345", useRedFolder: true })).toBe("#cc0000");
  });
});

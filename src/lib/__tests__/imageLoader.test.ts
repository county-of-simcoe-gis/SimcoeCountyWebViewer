import { describe, it, expect } from "vitest";
import imageLoader from "@/lib/imageLoader";

// The module reads process.env.NEXT_PUBLIC_BASE_PATH at the top level,
// so we need to re-import it for each basePath scenario.
describe("imageLoader", () => {
  const params = { src: "", width: 640, quality: 75 };

  describe("with no basePath", () => {
    it("returns external http URLs unchanged", () => {
      expect(imageLoader({ ...params, src: "http://example.com/img.png" })).toBe("http://example.com/img.png");
    });

    it("returns external https URLs unchanged", () => {
      expect(imageLoader({ ...params, src: "https://cdn.example.com/pic.jpg" })).toBe("https://cdn.example.com/pic.jpg");
    });

    it("returns protocol-relative URLs unchanged", () => {
      expect(imageLoader({ ...params, src: "//cdn.example.com/pic.jpg" })).toBe("//cdn.example.com/pic.jpg");
    });

    it("returns data: URLs unchanged", () => {
      const dataUrl = "data:image/png;base64,abc123";
      expect(imageLoader({ ...params, src: dataUrl })).toBe(dataUrl);
    });

    it("returns blob: URLs unchanged", () => {
      const blobUrl = "blob:http://localhost:3000/12345";
      expect(imageLoader({ ...params, src: blobUrl })).toBe(blobUrl);
    });

    it("prepends empty basePath to local paths", () => {
      expect(imageLoader({ ...params, src: "/images/logo.png" })).toBe("/images/logo.png");
    });
  });
});

/**
 * PostCSS plugin that rewrites url() references to public assets
 * so they include the NEXT_PUBLIC_BASE_PATH prefix.
 *
 * This is necessary because CSS url() values are not processed by
 * Next.js basePath — only <Image> and <Link> get automatic prefixing.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('postcss').PluginCreator} */
const plugin = () => {
  return {
    postcssPlugin: "postcss-basepath",
    Declaration(decl) {
      if (!BASE_PATH) return; // nothing to rewrite
      if (!decl.value.includes("url(")) return;

      // Match url(/images/...) or url("/images/...") or url('/images/...')
      // Only rewrite absolute paths starting with /images (public folder refs)
      decl.value = decl.value.replace(
        /url\(\s*(["']?)\/(images\/[^)"']+)\1\s*\)/g,
        (_, quote, path) => `url(${quote}${BASE_PATH}/${path}${quote})`
      );
    },
  };
};

plugin.postcss = true;
module.exports = plugin;

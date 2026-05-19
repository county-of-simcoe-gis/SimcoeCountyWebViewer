import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // GIS app loads images from external WMS/WFS services where next/image
      // requires custom loaders and explicit dimensions - impractical for dynamic map content
      "@next/next/no-img-element": "off",
      // The custom image loader in next.config.ts handles basePath for all
      // <Image> components.  The "unoptimized" prop skips the loader entirely,
      // which breaks basePath resolution and causes 404s.
      "no-restricted-syntax": [
        "error",
        {
          selector: 'JSXAttribute[name.name="unoptimized"]',
          message:
            'Do not use the "unoptimized" prop on <Image>. It bypasses the custom image loader that prepends basePath, causing image 404s. The loader already serves images directly without optimization.',
        },
      ],
    },
  },
  {
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "src/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;

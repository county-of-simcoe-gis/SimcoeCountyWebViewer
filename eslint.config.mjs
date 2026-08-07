import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["coverage/**", "test-results/**", "playwright-report/**", "vitest-output.txt"],
  },
  {
    rules: {
      // Next.js 16 / eslint-plugin-react-hooks added these stricter React
      // Compiler rules. Many existing components use patterns that the compiler
      // flags. Disable globally until the codebase can be refactored for React 19.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
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
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
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

import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "dist-pages/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        URL: "readonly",
        process: "readonly",
        console: "readonly",
        window: "readonly",
        document: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: { "no-empty": "off" },
  },
);

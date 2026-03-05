import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{ts,tsx,js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["*.config.{js,mjs,cjs,ts,mts,cts}", "eslint.config.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
    },
  },
  tseslint.configs.recommended,
]);

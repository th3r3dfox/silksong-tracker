// This is the configuration file for ESLint, the TypeScript linter:
// https://eslint.org/docs/latest/use/configure/

// We need to make a separate configuration file for JSON files because JavaScript/TypeScript rules
// will throw errors when applied to JSON files.

// @ts-check

import ESLintPluginJSON from "@eslint/json";
import { defineConfig } from "eslint/config";

export default defineConfig({
  plugins: {
    json: ESLintPluginJSON,
  },

  language: "json/json",

  // https://github.com/eslint/json?tab=readme-ov-file#rules
  rules: {
    "json/no-duplicate-keys": "error",
    "json/no-empty-keys": "error",
    "json/no-unnormalized-keys": "error",
    "json/no-unsafe-values": "error",
    "json/sort-keys": "error",
    "json/top-level-interop": "error",
  },
});

// This is the configuration file for ESLint, the TypeScript linter:
// https://eslint.org/docs/latest/use/configure/

// @ts-check

import { defineConfig } from "eslint/config";

export default defineConfig({
  rules: {
    curly: ["warn", "all"],
  },
});

// This is the configuration file for ESLint, the TypeScript linter:
// https://eslint.org/docs/latest/use/configure/

// @ts-check

import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    rules: {
      /**
       * Always requiring curly braces can partially ward against [Apple-style if statement
       * bugs](https://www.imperialviolet.org/2014/02/22/applebug.html). Additionally, this rule needs
       * to be set to "all" to [work properly with
       * Prettier](https://github.com/prettier/eslint-config-prettier#curly).
       */
      curly: ["warn", "all"],
    },
  },
  {
    files: ["js/save-parser.js"],
    rules: {
      /** We want to keep the save file schema in alphabetical order. */
      "sort-keys": [
        "warn",
        "asc",
        {
          caseSensitive: false,
        },
      ],
    },
  },
);

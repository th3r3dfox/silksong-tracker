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
    // By default, ESLint ignores "**/node_modules/" and ".git/":
    // https://eslint.org/docs/latest/use/configure/ignore#ignoring-files
    // We also want to ignore:
    // - The "dist" directory, since it is the idiomatic place for compiled output in TypeScript.
    // - Minified JavaScript files.
    ignores: ["**/dist/", "*.min.js"],
  },
);

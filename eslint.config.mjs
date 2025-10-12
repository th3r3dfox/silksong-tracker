// This is the configuration file for ESLint, the TypeScript linter:
// https://eslint.org/docs/latest/use/configure/

// @ts-check

import { completeConfigBase } from "eslint-config-complete";
import { defineConfig } from "eslint/config";

export default defineConfig(...completeConfigBase, {
  rules: {
    // By default, the upstream "n/file-extension-in-import" rule is enabled to lint for ".js" file
    // extensions, which is standard practice when writing TypeScript with ECMAScript modules that
    // will be transpiled to JavaScript. Since we use Vite, we can use ".ts" file extensions, which
    // is less confusing. However, it does not seem possible to configure
    // "n/file-extension-in-import" to work with ".ts" file extensions. Thus, we use
    // "import-x/extensions" instead.
    "n/file-extension-in-import": "off",
    "import-x/extensions": ["warn", "ignorePackages", { fix: true }],
  },
});

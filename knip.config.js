// This is the configuration file for Knip:
// https://knip.dev/overview/configuration

// @ts-check

/** @type {import("knip").KnipConfig} */
const config = {
  eslint: {
    config: ["eslint.config.mjs", "eslint.config.json.mjs"],
  },
  ignore: [
    "prettier.config.mjs", // Prettier is provided by "complete-lint".
  ],
  ignoreBinaries: [
    "eslint", // This is provided by "complete-lint".
    "prettier", // This is provided by "complete-lint".
  ],
  ignoreDependencies: [
    "ajv-cli", // This is used by the lint script.
    "ajv-formats", // This is used by the lint script.
    "eslint", // This is provided by "complete-lint".
    "eslint-config-complete", // This is provided by "complete-lint".
    "complete-lint", // This is a linting meta-package.
  ],
};

export default config;

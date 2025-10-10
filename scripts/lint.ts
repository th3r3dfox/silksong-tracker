import { lintCommands } from "complete-node";

await lintCommands(import.meta.dirname, [
  // Use TypeScript to type-check the code.
  "tsc --noEmit",
  "tsc --noEmit --project ./scripts/tsconfig.json",

  // Use ESLint to lint the TypeScript code.
  // - "--max-warnings 0" makes warnings fail, since we set all ESLint errors to warnings.
  "eslint --max-warnings 0 .",

  // Use Prettier to check formatting.
  // - "--log-level=warn" makes it only output errors.
  "prettier --log-level=warn --check .",

  // Use Knip to check for unused files, exports, and dependencies.
  // - "--no-progress" - Don't show dynamic progress updates. Progress is automatically disabled in
  //   CI environments.
  // - "--treat-config-hints-as-errors" - Exit with non-zero code (1) if there are any configuration
  //   hints.
  "knip --no-progress --treat-config-hints-as-errors",

  // Use CSpell to spell check every file.
  // - "--no-progress" and "--no-summary" make it only output errors.
  "cspell --no-progress --no-summary",

  // Check for unused words in the CSpell configuration file.
  "cspell-check-unused-words",

  // Check for template updates.
  // @template-ignore-next-line
  "complete-cli check --ignore LICENSE",
]);

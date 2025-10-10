import { lintCommands } from "complete-node";

await lintCommands(import.meta.dirname, [
  // Use TypeScript to type-check the code.
  "tsc --noEmit",
  "tsc --noEmit --project ./scripts/tsconfig.json",

  // Use ESLint to lint the code.
  // - "--max-warnings 0" makes warnings fail, since we set all ESLint errors to warnings.
  "eslint --max-warnings 0 .",

  // Use Prettier to check formatting.
  // - "--log-level=warn" makes it only output errors.
  "prettier --log-level=warn --check .",

  "ajv validate -c ajv-formats -d ./data/bosses.json -s ./data/bosses.schema.json",
  "ajv validate -c ajv-formats -d ./data/wishes.json -s ./data/wishes.schema.json",
]);

import { getFilePathsInDirectory, lintCommands } from "complete-node";
import path from "path";

const CHECK_JSON_COMMANDS: readonly string[] = await (async () => {
  const repoRoot = path.join(import.meta.dirname, "..");
  const dataPath = path.join(repoRoot, "js", "data");
  const filePaths = await getFilePathsInDirectory(dataPath);

  const jsonFilePaths = filePaths.filter(
    (filePath) =>
      filePath.endsWith(".json") && !filePath.endsWith(".schema.json"),
  );

  return jsonFilePaths.map((jsonFilePath) => {
    const { name } = path.parse(jsonFilePath);
    const schemaFilePath = path.join(dataPath, `${name}.schema.json`);
    return `ajv validate -c ajv-formats -d ${jsonFilePath} -s ${schemaFilePath}`;
  });
})();

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

  // Ensure that the JSON files match their schemas.
  ...CHECK_JSON_COMMANDS,
]);

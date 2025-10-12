import { getFilePathsInDirectory, lintCommands, readFile } from "complete-node";
import { globby } from "globby";
import path from "path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

const CHECK_JSON_COMMANDS: readonly string[] = await (async () => {
  const repoRoot = path.join(import.meta.dirname, "..");
  const dataPath = path.join(repoRoot, "src", "data");
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

async function checkForIllegalCharacters() {
  const ignoredExtensions = ["otf", "png", "svg", "ttf", "woff2"];
  const ignoredExtensionsGlob = ignoredExtensions.map(
    (extension) => `**/*.${extension}`,
  );
  const ignore = [...ignoredExtensionsGlob, "scripts/lint.ts"]; // We must also ignore this file.
  const filePaths = await globby("**", {
    cwd: REPO_ROOT,
    absolute: true,
    gitignore: true,
    ignore,
  });

  const fileInfos = await Promise.all(
    filePaths.map(async (filePath) => {
      return {
        filePath,
        fileContents: await readFile(filePath),
      };
    }),
  );

  const illegalCharacters = ["’", "—", "–"] as const;

  for (const fileInfo of fileInfos) {
    const { filePath, fileContents } = fileInfo;

    for (const character of illegalCharacters) {
      if (fileContents.includes(character)) {
        throw new Error(
          `Please remove all "${character}" character(s) in file: ${filePath}`,
        );
      }
    }
  }
}

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

  // Ensure that the JSON files satisfy their schemas.
  ...CHECK_JSON_COMMANDS,

  // Ensure that certain characters do not appear in any files.
  ["check for illegal characters", checkForIllegalCharacters()],
]);

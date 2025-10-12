import { assertObject, assertString, isArray, isObject } from "complete-common";
import { getFilePathsInDirectory, lintCommands, readFile } from "complete-node";
import { globby } from "globby";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

async function getDataJSONFilePaths(): Promise<readonly string[]> {
  const repoRoot = path.join(import.meta.dirname, "..");
  const dataPath = path.join(repoRoot, "src", "data");
  const filePaths = await getFilePathsInDirectory(dataPath);

  return filePaths.filter(
    (filePath) =>
      filePath.endsWith(".json") && !filePath.endsWith(".schema.json"),
  );
}

const CHECK_JSON_SCHEMA_COMMANDS: readonly string[] = await (async () => {
  const jsonFilePaths = await getDataJSONFilePaths();

  return jsonFilePaths.map((jsonFilePath) => {
    const { name, dir } = path.parse(jsonFilePath);
    const schemaFilePath = path.join(dir, `${name}.schema.json`);
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
    filePaths.map(async (filePath) => ({
      filePath,
      fileContents: await readFile(filePath),
    })),
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

async function checkJSONPropertes() {
  const jsonFilePaths = await getDataJSONFilePaths();

  const fileChecks = jsonFilePaths.map(async (jsonFilePath) => {
    const fileContents = await readFile(jsonFilePath);
    const json: unknown = JSON.parse(fileContents);
    assertObject(json, `A JSON file was not an object: ${jsonFilePath}`);
    checkRecursive(json, jsonFilePath, []);
  });

  await Promise.all(fileChecks);
}

function checkRecursive(
  value: unknown,
  filePath: string,
  propertyPath: ReadonlyArray<string | number>,
) {
  const pathString = propertyPath.length > 0 ? propertyPath.join(".") : "root";

  if (typeof value === "string") {
    if (value !== value.trim()) {
      throw new Error(
        `Property "${pathString}" has leading or trailing whitespace in file "${filePath}": ${value}`,
      );
    }

    if (value.includes("  ")) {
      throw new Error(
        `Property "${pathString}" has a double space in file "${filePath}": ${value}`,
      );
    }
  } else if (isArray(value)) {
    for (const [i, element] of value.entries()) {
      checkRecursive(element, filePath, [...propertyPath, i]);
    }
  } else if (isObject(value)) {
    for (const [key, val] of Object.entries(value)) {
      if (key !== key.trim()) {
        throw new Error(
          `Key "${pathString}" has leading or trailing whitespace in file "${filePath}": ${key}`,
        );
      }

      if (key === "description") {
        assertString(
          val,
          `A "description" property is not a string in file: ${filePath}`,
        );
        if (!val.endsWith(".") && !val.endsWith(".)") && !val.endsWith("?")) {
          throw new Error(
            `Property "${pathString}" does not end with a period in file "${filePath}": ${val}`,
          );
        }
      }

      checkRecursive(val, filePath, [...propertyPath, key]);
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
  "eslint --max-warnings 0 --config eslint.config.json.mjs .",

  // Use Prettier to check formatting.
  // - "--log-level=warn" makes it only output errors.
  "prettier --log-level=warn --check .",

  // Ensure that the JSON files satisfy their schemas.
  ...CHECK_JSON_SCHEMA_COMMANDS,

  // Ensure that certain characters do not appear in any files.
  // eslint-disable-next-line unicorn/prefer-top-level-await
  ["check for illegal characters", checkForIllegalCharacters()],
  // eslint-disable-next-line unicorn/prefer-top-level-await
  ["check JSON properties", checkJSONPropertes()],
]);

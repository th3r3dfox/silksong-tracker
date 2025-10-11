import { readFileSync } from "node:fs";
import { join } from "node:path";

const VALID_TYPES = [
  "boss",
  "collectable",
  "device",
  "flag",
  "flagInt",
  "journal",
  "key",
  "level",
  "materium",
  "quest",
  "relic",
  "sceneBool",
  "sceneVisited",
  "tool",
] as const;

type ItemType = (typeof VALID_TYPES)[number];

interface ValidationResult {
  file: string;
  invalidTypes: string[];
  missingTypes: string[];
  validTypes: Set<ItemType>;
}

function validateJsonFile(filePath: string): ValidationResult {
  const content = readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  const invalidTypes: string[] = [];
  const foundTypes = new Set<ItemType>();

  if (data.categories && Array.isArray(data.categories)) {
    for (const category of data.categories) {
      if (category.items && Array.isArray(category.items)) {
        for (const item of category.items) {
          if (item.type) {
            const itemType = item.type;
            if (VALID_TYPES.includes(itemType as ItemType)) {
              foundTypes.add(itemType as ItemType);
            } else {
              invalidTypes.push(
                `Invalid type "${itemType}" in item "${item.id || item.label || "unknown"}"`,
              );
            }
          }
        }
      }
    }
  }

  const missingTypes = VALID_TYPES.filter((type) => !foundTypes.has(type));

  return {
    file: filePath,
    invalidTypes,
    missingTypes,
    validTypes: foundTypes,
  };
}

function main(): void {
  const dataDir = join(process.cwd(), "src", "data");

  const jsonFiles = [
    "main.json",
    "bosses.json",
    "completion.json",
    "essentials.json",
    "wishes.json",
  ];

  console.log("Validating item types in JSON files...\n");

  let hasErrors = false;
  const allFoundTypes = new Set<ItemType>();
  const allInvalidTypes: string[] = [];

  for (const file of jsonFiles) {
    const filePath = join(dataDir, file);
    const result = validateJsonFile(filePath);

    console.log(`\n=== ${file} ===`);
    console.log(
      `Found types: ${[...result.validTypes].sort().join(", ") || "none"}`,
    );

    if (result.invalidTypes.length > 0) {
      console.error(`\nInvalid types found:`);
      for (const error of result.invalidTypes) {
        console.error(`  - ${error}`);
      }
      hasErrors = true;
      allInvalidTypes.push(...result.invalidTypes);
    }

    for (const type of result.validTypes) {
      allFoundTypes.add(type);
    }
  }

  const missingTypes = VALID_TYPES.filter((type) => !allFoundTypes.has(type));

  console.log("\n\n=== Summary ===");
  console.log(`Total valid types defined in Item.ts: ${VALID_TYPES.length}`);
  console.log(`Types found across all JSON files: ${allFoundTypes.size}`);
  console.log(`Types used: ${[...allFoundTypes].sort().join(", ") || "none"}`);

  if (missingTypes.length > 0) {
    console.log(
      `\nTypes NOT used in any JSON file: ${missingTypes.join(", ")}`,
    );
  } else {
    console.log("\nAll types are used in at least one JSON file!");
  }

  if (allInvalidTypes.length > 0) {
    console.error(
      `\n\nValidation FAILED: ${allInvalidTypes.length} invalid type(s) found.`,
    );
    process.exit(1);
  } else {
    console.log("\nValidation PASSED: All types are valid!");
  }
}

main();

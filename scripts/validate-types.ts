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

// Properties defined in BaseItem interface from Item.ts
const BASE_ITEM_PROPERTIES = [
  "id",
  "label",
  "icon",
  "act",
  "map",
  "missable",
  "mode",
  "description",
  "link",
  "cost",
  "obtain",
  "category",
  "exclusiveGroup",
  "upgradeOf",
] as const;

interface ValidationResult {
  file: string;
  invalidTypes: string[];
  missingTypes: string[];
  validTypes: Set<ItemType>;
}

interface PropertyUsage {
  [key: string]: number;
}

function validateJsonFile(
  filePath: string,
  propertyUsage: PropertyUsage,
): ValidationResult {
  const content = readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  const invalidTypes: string[] = [];
  const foundTypes = new Set<ItemType>();

  if (data.categories && Array.isArray(data.categories)) {
    for (const category of data.categories) {
      if (category.items && Array.isArray(category.items)) {
        for (const item of category.items) {
          // Track property usage
          for (const prop of Object.keys(item)) {
            if (BASE_ITEM_PROPERTIES.includes(prop as any)) {
              propertyUsage[prop] = (propertyUsage[prop] || 0) + 1;
            }
          }

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
  const propertyUsage: PropertyUsage = {};

  for (const file of jsonFiles) {
    const filePath = join(dataDir, file);
    const result = validateJsonFile(filePath, propertyUsage);

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

  console.log("\n\n=== Type Validation Summary ===");
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

  // Property usage validation
  console.log("\n\n=== Property Usage Summary ===");
  console.log(
    `Total properties defined in BaseItem (Item.ts): ${BASE_ITEM_PROPERTIES.length}`,
  );

  const usedProperties = Object.keys(propertyUsage).sort();
  const unusedProperties = BASE_ITEM_PROPERTIES.filter(
    (prop) => !propertyUsage[prop],
  );

  console.log(`\nProperties used (${usedProperties.length}):`);
  for (const prop of usedProperties) {
    console.log(`  - ${prop}: used ${propertyUsage[prop]} times`);
  }

  if (unusedProperties.length > 0) {
    console.log(
      `\n⚠️  Properties NOT used in any JSON file (${unusedProperties.length}):`,
    );
    for (const prop of unusedProperties) {
      console.log(`  - ${prop}`);
    }
    console.log(
      "\nConsider removing these unused properties from the BaseItem interface in Item.ts",
    );
  } else {
    console.log("\n✓ All BaseItem properties are used in at least one item!");
  }

  if (allInvalidTypes.length > 0) {
    console.error(
      `\n\nValidation FAILED: ${allInvalidTypes.length} invalid type(s) found.`,
    );
    process.exit(1);
  } else {
    console.log("\n\nValidation PASSED: All types are valid!");
    if (unusedProperties.length > 0) {
      console.log(
        "Note: Some properties are unused. Review the summary above.",
      );
    }
  }
}

main();

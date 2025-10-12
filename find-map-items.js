import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataFiles = [
  "src/data/main.json",
  "src/data/bosses.json",
  "src/data/essentials.json",
  "src/data/wishes.json",
  "src/data/completion.json",
];

const search = process.argv[2];

function findItemsWithProp() {
  const results = [];

  for (const file of dataFiles) {
    try {
      const filePath = join(__dirname, file);
      const content = readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      let categories = [];
      if (Array.isArray(data)) {
        categories = data;
      } else if (data.categories && Array.isArray(data.categories)) {
        categories = data.categories;
      } else if (typeof data === "object" && data.items) {
        categories = [data];
      }

      for (const category of categories) {
        if (category.items && Array.isArray(category.items)) {
          for (const item of category.items) {
            if (search in item) {
              results.push({
                file,
                categoryId: category.id,
                categoryLabel: category.label,
                itemId: item.id,
                itemLabel: item.label,
                map: item.map,
                type: item.type,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }

  return results;
}

console.log(`Searching for items with "${search}" property...\n`);
const itemsWithProp = findItemsWithProp();

if (itemsWithProp.length === 0) {
  console.log(`No items with "${search}" property found.`);
} else {
  console.log(
    `Found ${itemsWithProp.length} items with "${search}" property:\n`,
  );

  const groupedByFile = itemsWithProp.reduce((acc, item) => {
    if (!acc[item.file]) {
      acc[item.file] = [];
    }
    acc[item.file].push(item);
    return acc;
  }, {});

  for (const [file, items] of Object.entries(groupedByFile)) {
    console.log(`\n${file} (${items.length} items):`);
    console.log("=".repeat(80));
    for (const item of items) {
      console.log(`\n  Category: ${item.categoryLabel} (${item.categoryId})`);
      console.log(`  Item: ${item.itemLabel} (${item.itemId})`);
      console.log(`  Type: ${item.type}`);
      console.log(`  ${search}: ${item[search]}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `\nSummary: ${itemsWithProp.length} total items with "${search}" property`,
  );
  console.log("\nUnique types found:");
  const types = [...new Set(itemsWithProp.map((item) => item.type))];
  types.forEach((type) => {
    const count = itemsWithProp.filter((item) => item.type === type).length;
    console.log(`  - ${type}: ${count} items`);
  });
}

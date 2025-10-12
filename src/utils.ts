import { BASE_PATH } from "./constants.ts";
import type { Item } from "./types/Item.ts";

/** Helper function to lower case a string, replace all whitespace with a single space, and trim. */
export function normalizeString(string: string): string {
  return string.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

/**
 * Helper function to trim a string, replace all whitespace with a single underscore, and replace
 * all characters that are not letters/numbers/periods with underscores.
 */
export function normalizeStringWithUnderscores(string: string): string {
  return string
    .trim()
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^\w.]/g, "_");
}

export function getIconPath(item: Item): string {
  return `${BASE_PATH}/assets/${item.icon}`;
}

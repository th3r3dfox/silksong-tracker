/**
 * Helper function to lower case a string, replace all whitespace with a single space, and trim.
 */
export function normalizeString(string: string) {
  if (typeof string !== "string") {
    string = String(string);
  }

  return string.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Helper function to trim a string, replace all whitespace with a single underscore, and replace
 * all characters that are not letters/numbers/periods with underscores.
 */
export function normalizeStringWithUnderscores(string: string) {
  if (typeof string !== "string") {
    string = String(string);
  }

  return string
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.]/g, "_");
}

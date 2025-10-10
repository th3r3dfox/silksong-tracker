/**
 * Helper function to throw an error if the provided value is not an array.
 *
 * @param {unknown} value
 * @param {string} msg
 * @returns {asserts value is unknown[]}
 * @throws {TypeError}
 */
export function assertArray(value, msg) {
  if (!Array.isArray(value)) {
    throw new TypeError(msg);
  }
}

/**
 * Helper function to throw an error if the provided value is equal to `undefined`.
 *
 * This is useful to have TypeScript narrow a `T | undefined` value to `T` in a concise way.
 *
 * @template T
 * @param {T} value
 * @param {string} msg
 * @returns {asserts value is Exclude<T, undefined>}
 * @throws {TypeError}
 */
export function assertDefined(value, msg) {
  if (value === undefined) {
    throw new TypeError(msg);
  }
}

/**
 * Helper function to throw an error if the provided value is not an instance of the expected class.
 *
 * This is useful to have TypeScript narrow a value to a specific type in a concise way.
 *
 * @template {abstract new (...args: any) => any} T
 * @param {unknown} value
 * @param {T} constructor
 * @param {string} msg
 * @returns {asserts value is InstanceType<T>}
 * @throws {TypeError}
 */
export function assertIs(value, constructor, msg) {
  if (!(value instanceof constructor)) {
    throw new TypeError(msg);
  }
}

/**
 * Helper function to throw an error if the provided value is equal to `null`.
 *
 * This is useful to have TypeScript narrow a `T | null` value to `T` in a concise way.
 *
 * @template T
 * @param {T} value
 * @param {string} msg
 * @returns {asserts value is Exclude<T, null>}
 * @throws {TypeError}
 */
export function assertNotNull(value, msg) {
  if (value === null) {
    throw new TypeError(msg);
  }
}

/**
 * Helper function to throw an error if the provided value is not an object (i.e. a TypeScript
 * record).
 *
 * This is useful to have TypeScript narrow a `Record<string, unknown> | undefined` value to
 * `Record<string, unknown>` in a concise way.
 *
 * Under the hood, this function uses the `isObject` helper function.
 *
 * @param {unknown} value
 * @param {string} msg
 * @returns {asserts value is Record<string, unknown>}
 * @throws {TypeError}
 */
export function assertObject(value, msg) {
  if (!isObject(value)) {
    throw new TypeError(msg);
  }
}

/**
 * Helper function to throw an error if the provided value is not a string.
 *
 * @param {unknown} value
 * @param {string} msg
 * @returns {asserts value is string}
 * @throws {TypeError}
 */
export function assertString(value, msg) {
  if (typeof value !== "string") {
    throw new TypeError(msg);
  }
}

/**
 * A wrapper around `Array.isArray` that narrows the type to `unknown[]`.
 *
 * @param {unknown} variable
 * @returns {variable is unknown[]}
 */
export function isArray(variable) {
  return Array.isArray(variable);
}

/**
 * Helper function to narrow an unknown value to an object (i.e. a TypeScript record).
 *
 * Under the hood, this checks for `typeof variable === "object"`, `variable !== null`, and
 * `!Array.isArray(variable)`.
 *
 * @param {unknown} variable
 * @returns {variable is Record<string, unknown>}
 */
export function isObject(variable) {
  return (
    typeof variable === "object"
    && variable !== null
    && !Array.isArray(variable)
  );
}

/** @param {string} string */
export function normalizeString(string) {
  if (typeof string !== "string") {
    string = String(string);
  }

  return string.toLowerCase().replace(/\s+/g, " ").trim();
}

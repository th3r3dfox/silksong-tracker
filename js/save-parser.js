import { z } from "https://cdn.jsdelivr.net/npm/zod@4/+esm";
import { assertString, isArray, isObject } from "./utils.js";

export const objectWithSavedData = z.object({
  savedData: z.array(
    z.object({
      Data: z.record(z.string(), z.unknown()),
      Name: z.string(),
    }),
  ),
});

export const silksongSaveSchema = z.object({
  playerData: z
    .object({
      Collectables: objectWithSavedData,
      completionPercentage: z.int(),
      geo: z.int(),
      permadeathMode: z.union([z.literal(0), z.literal(1)]),
      playTime: z.number(),
      QuestCompletionData: objectWithSavedData,
      ShellShards: z.int(),
      ToolEquips: objectWithSavedData,
      Tools: objectWithSavedData,
    })
    .readonly(),
  sceneData: z.object({}).readonly(),
});

/** @param {Record<string, unknown>} saveFile */
export async function parseSilksongSave(saveFile) {
  const result = silksongSaveSchema.safeParse(saveFile);
  if (!result.success) {
    const issues = JSON.stringify(result.error.issues, undefined, 2);
    console.error(`Failed to parse the save file: ${issues}`);
    return undefined;
  }

  return result.data;
}

/**
 * Recursively search through the save file and create a flat map of all "flag-style" entries. This
 * simplifies checking for flags later, since some flags are represented in the raw save file as a
 * boolean and some as an integer.
 *
 * @param {Record<string, unknown>} root
 */
export function getSaveFileFlags(root) {
  /** @type Record<string, Record<string, boolean>> */
  const flags = {};

  /**
   * @param {string} sceneRaw
   * @param {string} idRaw
   * @param {number | boolean} value
   */
  function mark(sceneRaw, idRaw, value) {
    if (!sceneRaw || !idRaw) {
      return;
    }
    const scene = sceneRaw.trim().replace(/\s+/g, "_");
    const idKey = idRaw
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w.]/g, "_");

    if (flags[scene] === undefined) {
      flags[scene] = {};
    }
    flags[scene][idKey] = Boolean(value);
  }

  /** @param {unknown} node */
  function walk(node) {
    if (isArray(node)) {
      for (const element of node) {
        walk(element);
      }
      return;
    }

    if (isObject(node)) {
      const { SceneName, ID, Value } = node;

      if (SceneName !== undefined && ID !== undefined && Value !== undefined) {
        assertString(SceneName, 'The "SceneName" property is not a string.');
        assertString(ID, 'The "ID" property is not a string.');
        if (typeof Value !== "number" && typeof Value !== "boolean") {
          throw new TypeError(
            `The \"Value\" property has an unknown type of: ${typeof Value}`,
          );
        }

        mark(SceneName, ID, Value);
      }

      for (const value in Object.values(node)) {
        walk(value);
      }
    }
  }

  walk(root);
  return flags;
}

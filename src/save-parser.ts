import type { ReadonlyRecord } from "complete-common";
import { assertString, isArray, isObject } from "complete-common";
import { z } from "zod";
import { normalizeStringWithUnderscores } from "./utils.js";

export const objectWithSavedData = z.object({
  savedData: z.array(
    z.object({
      Data: z.record(z.string(), z.unknown()),
      Name: z.string(),
    }),
  ),
});

export interface ObjectWithSavedData
  extends z.infer<typeof objectWithSavedData> {}

export const silksongSaveSchema = z.object({
  playerData: z
    .object({
      Collectables: objectWithSavedData,
      completionPercentage: z.int(),
      EnemyJournalKillData: z.object({
        list: z.array(
          z.object({
            Name: z.string(),
            Record: z.object({
              Kills: z.int(),
              HasBeenSeen: z.boolean(),
            }),
          }),
        ),
      }),
      MateriumCollected: objectWithSavedData,
      MementosDeposited: objectWithSavedData,
      geo: z.int(),
      permadeathMode: z.union([z.literal(0), z.literal(1)]),
      playTime: z.number(),
      QuestCompletionData: objectWithSavedData,
      Relics: objectWithSavedData,
      scenesVisited: z.array(z.string()),
      ShellShards: z.int(),
      ToolEquips: objectWithSavedData,
      Tools: objectWithSavedData,

      // Keys
      PurchasedBonebottomFaithToken: z.boolean(),
      CollectedDustCageKey: z.boolean(),
      MerchantEnclaveSimpleKey: z.boolean(),
      BallowGivenKey: z.boolean(),
      collectedWardKey: z.boolean(),
      collectedWardBossKey: z.boolean(),
      HasSlabKeyC: z.boolean(),
      HasSlabKeyA: z.boolean(),
      HasSlabKeyB: z.boolean(),
      PurchasedArchitectKey: z.boolean(),
    })
    .readonly(),
  sceneData: z.object({}).readonly(),
});

export interface SilksongSave extends z.infer<typeof silksongSaveSchema> {}

export async function parseSilksongSave(
  saveFile: ReadonlyRecord<string, unknown>,
): Promise<SilksongSave | undefined> {
  const result = await silksongSaveSchema.safeParseAsync(saveFile);
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
 */
export function getSaveFileFlags(
  root: ReadonlyRecord<string, unknown>,
): Record<string, Record<string, boolean>> {
  const flags: Record<string, Record<string, boolean>> = {};

  function mark(scene: string, id: string, value: number | boolean) {
    scene = normalizeStringWithUnderscores(scene);
    id = normalizeStringWithUnderscores(id);

    let flagsScene = flags[scene];
    if (flagsScene === undefined) {
      flagsScene = {};
      flags[scene] = flagsScene;
    }

    flagsScene[id] = Boolean(value);
  }

  function walk(node: unknown) {
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
            `The "Value" property has an unknown type of: ${typeof Value}`,
          );
        }

        mark(SceneName, ID, Value);
      }

      for (const value of Object.values(node)) {
        walk(value);
      }
    }
  }

  walk(root);
  return flags;
}

import { z } from "https://cdn.jsdelivr.net/npm/zod@4/+esm";

/** TODO: Use Zod so that we don't have to manually validate every field in the entire save file. */
export const silksongSaveSchema = z.object({
  playerData: z
    .object({
      completionPercentage: z.int(),
      geo: z.int(),
      permadeathMode: z.union([z.literal(0), z.literal(1)]),
      playTime: z.number(),
      ShellShards: z.int(),
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

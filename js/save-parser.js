import { z } from "https://cdn.jsdelivr.net/npm/zod@3/+esm";

export const silksongSaveSchema = z.object({
  playerData: z.object({}).readonly(),
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

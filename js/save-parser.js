import { z } from "https://cdn.jsdelivr.net/npm/zod@3/+esm";
import { showToast } from "./utils.js";

export const silksongSaveSchema = z.object({
  playerData: z.unknown(),
  sceneData: z.unknown(),
});

/** @param {Record<string, unknown>} saveFile */
export async function parseSilksongSave(saveFile) {
  console.log(saveFile);

  const result = silksongSaveSchema.safeParse(saveFile);
  if (!result.success) {
    const issues = JSON.stringify(result.error.issues, undefined, 2);
    const msg = `Failed to parse the save file: ${issues}`;
    console.log(msg);
    showToast(msg);
    return undefined;
  }

  return result.data;
}

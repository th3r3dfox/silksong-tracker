import { rawSaveOutput } from "../elements.ts";
import { getSaveData } from "../save-data.ts";

export function updateTabRawSave(): void {
  const saveData = getSaveData();

  if (saveData === undefined) {
    rawSaveOutput.textContent = "⚠️ No save file loaded.";
  }

  try {
    rawSaveOutput.textContent = JSON.stringify(saveData, undefined, 2);
  } catch (error) {
    rawSaveOutput.textContent = `❌ Failed to display raw save: ${error}`;
    console.error(error);
  }
}

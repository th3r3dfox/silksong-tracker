import { assertObject, isObject } from "complete-common";
import { BASE_PATH } from "./constants.ts";
import {
  completionValue,
  modeBanner,
  playtimeValue,
  rawSaveOutput,
  rosariesValue,
  shardsValue,
  uploadOverlay,
} from "./elements.ts";
import { renderActiveTab } from "./render-tab.ts";
import { decodeSilksongSave } from "./save-decoder.ts";
import type { ObjectWithSavedData, SilksongSave } from "./save-parser";
import { getSaveFileFlags, parseSilksongSave } from "./save-parser.ts";
import type { Item } from "./types/Item";
import type { Mode } from "./types/Mode";
import {
  normalizeString,
  normalizeStringWithUnderscores,
  showToast,
} from "./utils.ts";

let currentLoadedSaveData: SilksongSave | undefined;
let currentLoadedSaveDataMode: Mode = "normal";
let currentLoadedSaveDataFlags: Record<string, unknown> | undefined;

export function getSaveData(): SilksongSave | undefined {
  return currentLoadedSaveData;
}

export function getSaveDataMode(): Mode {
  return currentLoadedSaveDataMode;
}

export function getSaveDataFlags(): Record<string, unknown> | undefined {
  return currentLoadedSaveDataFlags;
}

export async function handleSaveFile(file: File | undefined): Promise<void> {
  try {
    if (file === undefined) {
      showToast("❌ No file selected.");
      uploadOverlay.classList.remove("hidden");
      return;
    }

    const buffer = await file.arrayBuffer();
    const isJSON = file.name.toLowerCase().endsWith(".json");

    const saveDataRaw: unknown = isJSON
      ? JSON.parse(new TextDecoder("utf8").decode(buffer))
      : decodeSilksongSave(buffer);

    assertObject(
      saveDataRaw,
      "Failed to convert the decrypted save file to an object.",
    );

    const saveData = await parseSilksongSave(saveDataRaw);
    if (saveData === undefined) {
      showToast("❌ Invalid or corrupted save file");
      uploadOverlay.classList.remove("hidden");
      return;
    }

    rawSaveOutput.textContent = JSON.stringify(saveData, undefined, 2);

    // @ts-expect-error The save file is huge and we do not want to specify every property. Instead
    // of marking the Zod schema as loose, it is simpler to just assign the pre-validation object.
    currentLoadedSaveData = saveDataRaw;
    currentLoadedSaveDataFlags = getSaveFileFlags(saveDataRaw);

    // Update UI statistics.
    completionValue.textContent = `${saveData.playerData.completionPercentage}%`;

    const seconds = saveData.playerData.playTime;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    playtimeValue.textContent = `${hours}h ${mins}m`;

    rosariesValue.textContent = saveData.playerData.geo.toString();
    shardsValue.textContent = saveData.playerData.ShellShards.toString();

    const isSteelSoul = saveData.playerData.permadeathMode === 1;

    // Save mode globally (after declaration).
    currentLoadedSaveDataMode = isSteelSoul ? "steel" : "normal";

    // Show visual banner.
    modeBanner.innerHTML = isSteelSoul
      ? `<img src="${BASE_PATH}/assets/icons/Steel_Soul_Icon.png" alt="Steel Soul" class="mode-icon"> STEEL SOUL SAVE LOADED`
      : "NORMAL SAVE LOADED";
    modeBanner.classList.remove("hidden");
    modeBanner.classList.toggle("steel", isSteelSoul);

    renderActiveTab();

    showToast("✅ Save file loaded successfully!");
    uploadOverlay.classList.add("hidden");
  } catch (error) {
    console.error("[save] Decode error:", error);
    showToast(
      "⚠️ Browser permission or file access issue. Please reselect your save file.",
    );
    uploadOverlay.classList.remove("hidden");
  }
}

export function getSaveDataValue(
  saveData: SilksongSave | undefined,
  saveDataFlags: Record<string, unknown> | undefined,
  item: Item,
): unknown {
  if (saveData === undefined || saveDataFlags === undefined) {
    return undefined;
  }

  const { playerData } = saveData;
  const playerDataExpanded: Record<string, unknown> = playerData;

  const { type } = item;

  switch (type) {
    case "flag": {
      const { flag } = item;
      return playerDataExpanded[flag];
    }

    case "collectable": {
      const { flag } = item;
      const { savedData } = playerData.Collectables;

      const entry = savedData.find((element) => element.Name === flag);
      if (entry === undefined) {
        return undefined;
      }

      const { Data } = entry;
      const { Amount } = Data;
      return Amount ?? 0;
    }

    case "tool": {
      const { flag } = item;
      const normalizedFlag = normalizeString(flag);

      function findIn(object: ObjectWithSavedData) {
        const matchingElement = object.savedData.find(
          (element) => normalizeString(element.Name) === normalizedFlag,
        );

        if (matchingElement === undefined) {
          return undefined;
        }

        return matchingElement;
      }

      const { Tools, ToolEquips } = playerData;
      const entry = findIn(Tools) ?? findIn(ToolEquips);
      if (entry === undefined) {
        return undefined;
      }

      return entry.Data["IsUnlocked"] === true;
    }

    // Wishes
    case "quest": {
      const { flag } = item;
      const normalizedFlag = normalizeString(flag);

      const { QuestCompletionData } = playerData;
      const entry = QuestCompletionData.savedData.find(
        (e) => normalizeString(e.Name) === normalizedFlag,
      );
      if (entry === undefined) {
        return undefined;
      }

      const { Data } = entry;

      if (Data["IsCompleted"] === true) {
        return "completed";
      }

      if (Data["IsAccepted"] === true) {
        return "accepted";
      }

      return false;
    }

    // Mask Shards, Heart Pieces etc.
    case "sceneBool": {
      const { scene, flag } = item;

      const normalizedScene = normalizeStringWithUnderscores(scene);
      const normalizedFlag = normalizeStringWithUnderscores(flag);

      const sceneFlags = saveDataFlags[normalizedScene];
      if (isObject(sceneFlags)) {
        const value = sceneFlags[normalizedFlag];
        if (value !== undefined) {
          return value;
        }
      }

      return false;
    }

    case "key": {
      const { flag } = item;

      return playerDataExpanded[flag] === true;
    }

    case "quill": {
      const { flag } = item;

      // If player does not have quill, return 0.
      if (playerDataExpanded["hasQuill"] !== true) {
        return 0;
      }

      // Always return the number, unlock is calculated later.
      return playerDataExpanded[flag] ?? 0;
    }

    // Silk Hearts, Memories etc.
    case "sceneVisited": {
      const scenes = playerData.scenesVisited;
      return scenes.includes(item.scene);
    }

    // Numeric progressions (Needle, ToolPouchUpgrades, ToolKitUpgrades, etc.)
    case "level": {
      const { flag } = item;

      // Always return the number, unlock is calculated later.
      return playerDataExpanded[flag] ?? 0;
    }

    case "flagInt": {
      const { flag } = item;

      const current = playerDataExpanded[flag];
      return typeof current === "number" ? current >= 1 : false;
    }

    case "journal": {
      const { list } = playerData.EnemyJournalKillData;
      const entry = list.find((element) => element.Name === item.flag);
      if (entry === undefined) {
        return 0; // invece di false
      }

      const { Record } = entry;
      const { Kills } = Record;
      return Kills;
    }

    case "relic": {
      const { Relics, MementosDeposited } = playerData;

      const combinedList = [
        ...Relics.savedData,
        ...MementosDeposited.savedData,
      ];

      const entry = combinedList.find((element) => element.Name === item.flag);
      if (entry === undefined) {
        return false;
      }

      const { Data } = entry;

      if (Data["IsDeposited"] === true) {
        return "deposited";
      }

      if (Data["HasSeenInRelicBoard"] === true) {
        return "collected";
      }

      if (Data["IsCollected"] === true) {
        return "collected";
      }

      return false;
    }

    case "materium": {
      const { MateriumCollected } = playerData;

      const entry = MateriumCollected.savedData.find(
        (element) => element.Name === item.flag,
      );
      if (entry === undefined) {
        return false;
      }

      const { Data } = entry;

      if (Data["HasSeenInRelicBoard"] === true) {
        return "deposited";
      }

      if (Data["IsCollected"] === true) {
        return "collected";
      }

      return false;
    }

    // Materium, Farsight, etc.
    case "device": {
      const { scene, flag, relatedFlag } = item;

      const normalizedScene = normalizeStringWithUnderscores(scene);
      const normalizedFlag = normalizeStringWithUnderscores(flag);

      if (playerDataExpanded[relatedFlag] === true) {
        return "deposited";
      }

      const sceneFlags = saveDataFlags[normalizedScene];
      if (isObject(sceneFlags) && sceneFlags[normalizedFlag] === true) {
        return "collected";
      }

      return false;
    }

    case "boss": {
      const { flag } = item;

      // Boss items are simple boolean flags.
      return playerDataExpanded[flag];
    }
  }
}

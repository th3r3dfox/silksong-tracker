import { assertObject, isArray, isObject } from "complete-common";
import { BASE_PATH } from "./constants.ts";
import {
  completionValue,
  modeBanner,
  playtimeValue,
  rosariesValue,
  saveDateContainer,
  saveDateValue,
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

const LOCAL_STORAGE_SAVE_KEY = "silksong-tracker-save-data";

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
      showToast("No file selected.");
      uploadOverlay.classList.remove("hidden");
      return;
    }

    const scrollContainer = document.querySelector("main");
    const currentScroll = scrollContainer ? scrollContainer.scrollTop : 0;

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
      showToast("Invalid or corrupted save file");
      uploadOverlay.classList.remove("hidden");
      return;
    }

    saveToLocalStorage(saveDataRaw);
    processSaveData(saveDataRaw as unknown as SilksongSave, saveData);

    if (scrollContainer) {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = currentScroll;
      });
    }

    showToast("Save file loaded successfully!");
    uploadOverlay.classList.add("hidden");
  } catch (error) {
    console.error("[save] Decode error:", error);
    showToast("Error processing save file.");
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

  const { playerData, sceneData } = saveData;
  const playerDataExpanded: Record<string, unknown> = playerData;
  const sceneDataExpanded: Record<string, unknown> = sceneData;

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
      const { scene, flag, required } = item;

      const normalizedScene = normalizeStringWithUnderscores(scene);
      const normalizedFlag = normalizeStringWithUnderscores(flag);

      const sceneFlags = saveDataFlags[normalizedScene];
      if (isObject(sceneFlags)) {
        const value = sceneFlags[normalizedFlag];

        if (
          flag === "Shell Fossil Mimic"
          || flag === "Shell Fossil Mimic AppearVariant"
        ) {
          const sceneValue = checkSceneValue(sceneDataExpanded, scene, flag);
          return required === sceneValue;
        }

        if (value !== undefined) {
          return value;
        }
      }

      return false;
    }

    case "key": {
      if ("flags" in item && item.flags) {
        return item.flags.some((flag) => playerDataExpanded[flag] === true);
      }
      const { flag } = item;
      if (typeof flag !== "string" || flag === "") {
        return false;
      }
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

    case "anyOf": {
      const results: unknown[] = [];

      for (const check of item.anyOf) {
        const mockItem = {
          ...item,
          type: check.type,
          flag: "flag" in check ? check.flag : undefined,
          scene: "scene" in check ? check.scene : undefined,
          required: "required" in check ? check.required : undefined,
        } as Item;

        const checkResult = getSaveDataValue(saveData, saveDataFlags, mockItem);
        results.push(checkResult);
      }

      return results;
    }
  }
}

function checkSceneValue(
  sceneDataExpanded: unknown,
  scene: string,
  flag: string,
): number | undefined {
  const { persistentInts } = sceneDataExpanded as { persistentInts: unknown };

  if (!isObject(persistentInts)) {
    return undefined;
  }
  const { serializedList } = persistentInts as { serializedList: unknown };
  if (!isArray(serializedList)) {
    return undefined;
  }

  const element = serializedList.find(
    (e: unknown): e is { SceneName: string; Value: number; ID: string } =>
      isObject(e)
      && e["SceneName"] === scene
      && typeof e["Value"] === "number"
      && e["ID"] === flag,
  );

  return element ? element.Value : undefined;
}

export function clearAllData(): void {
  currentLoadedSaveData = undefined;
  currentLoadedSaveDataFlags = undefined;
  currentLoadedSaveDataMode = "normal";

  const cleanUrl = globalThis.location.origin + globalThis.location.pathname;
  globalThis.history.pushState({}, "", cleanUrl);

  modeBanner.classList.add("hidden");
  modeBanner.innerHTML = "";
  saveDateContainer.classList.add("hidden");
  saveDateValue.textContent = "";
  completionValue.textContent = "0%";
  playtimeValue.textContent = "0h 00m";
  rosariesValue.textContent = "0";
  shardsValue.textContent = "0";

  localStorage.removeItem(LOCAL_STORAGE_SAVE_KEY);

  const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
  if (fileInput) {
    fileInput.value = "";
  }

  globalThis.dispatchEvent(new Event("save-data-changed"));

  try {
    renderActiveTab();
  } catch (error) {
    console.warn("Reset render executed on current tab", error);
  }

  showToast("Data cleared.");
}

function saveToLocalStorage(saveDataRaw: unknown) {
  try {
    const saveDataString = JSON.stringify(saveDataRaw);
    localStorage.setItem(LOCAL_STORAGE_SAVE_KEY, saveDataString);
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

function processSaveData(
  saveDataRaw: SilksongSave,
  saveData: Exclude<Awaited<ReturnType<typeof parseSilksongSave>>, undefined>,
) {
  currentLoadedSaveData = saveDataRaw;
  currentLoadedSaveDataFlags = getSaveFileFlags(saveDataRaw);

  completionValue.textContent = `${saveData.playerData.completionPercentage}%`;
  const seconds = saveData.playerData.playTime;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  playtimeValue.textContent = `${hours}h ${mins}m`;
  rosariesValue.textContent = saveData.playerData.geo.toString();
  shardsValue.textContent = saveData.playerData.ShellShards.toString();

  const isSteelSoul = ([1, 2, 3, "On", "Dead"] as Array<string | number | undefined>).includes(saveData.playerData.permadeathMode);
  currentLoadedSaveDataMode = isSteelSoul ? "steel" : "normal";

  modeBanner.innerHTML = isSteelSoul
    ? `<img src="${BASE_PATH}/assets/icons/Steel_Soul_Icon.png" alt="Steel Soul" class="mode-icon"> STEEL SOUL SAVE LOADED`
    : "NORMAL SAVE LOADED";
  modeBanner.classList.remove("hidden");
  modeBanner.classList.toggle("steel", isSteelSoul);

  const saveDate = saveData.playerData.date;
  const formattedSaveDate = new Date(saveDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  saveDateValue.textContent = formattedSaveDate;
  saveDateContainer.classList.remove("hidden");

  renderActiveTab();
  globalThis.dispatchEvent(new Event("save-data-changed"));
}

function loadFromLocalStorage(): unknown {
  try {
    const saveDataString = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
    if (saveDataString === null) {
      return undefined;
    }
    return JSON.parse(saveDataString);
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return undefined;
  }
}

export async function loadSavedDataOnMount(): Promise<void> {
  const savedData = loadFromLocalStorage();
  if (savedData === undefined) {
    return;
  }

  try {
    assertObject(savedData, "Invalid saved data in localStorage.");

    const saveData = await parseSilksongSave(savedData);
    if (saveData === undefined) {
      console.warn("Failed to parse saved data from localStorage");
      return;
    }

    processSaveData(savedData as unknown as SilksongSave, saveData);
  } catch (error) {
    console.error("Error loading saved data from localStorage:", error);
  }
}

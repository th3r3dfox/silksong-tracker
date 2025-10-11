// @ts-nocheck

import {
  assertArray,
  assertDefined,
  assertIs,
  assertNotNull,
  assertObject,
  isObject,
} from "complete-common";
import { z } from "zod";
import bossesJSON from "./data/bosses.json" with { type: "json" };
import completionJSON from "./data/completion.json" with { type: "json" };
import essentialsJSON from "./data/essentials.json" with { type: "json" };
import mainJSON from "./data/main.json" with { type: "json" };
import wishesJSON from "./data/wishes.json" with { type: "json" };
import {
  actDropdownBtn,
  actDropdownMenu,
  allProgressGrid,
  backToTop,
  closeInfoModal,
  closeUploadModal,
  completionValue,
  copyRawsaveBtn,
  downloadRawsaveBtn,
  dropzone,
  fileInput,
  infoContent,
  infoOverlay,
  missingToggle,
  modeBanner,
  nextMatch,
  openUploadModal,
  playtimeValue,
  prevMatch,
  rawSaveOutput,
  rawSaveSearch,
  rosariesValue,
  searchCounter,
  shardsValue,
  spoilerToggle,
  uploadOverlay,
} from "./elements.js";
import type { Item } from "./interfaces/Item.ts";
import type { Mode } from "./interfaces/Mode.ts";
import { decodeSilksongSave } from "./save-decoder.js";
import {
  getSaveFileFlags,
  objectWithSavedData,
  parseSilksongSave,
  silksongSaveSchema,
} from "./save-parser.js";
import { normalizeString, normalizeStringWithUnderscores } from "./utils.js";

console.log(
  "No cost too great. No mind to think. No will to break. No voice to cry suffering.",
);

const BASE_PATH = "/silksong-tracker/";

let tocObserver: IntersectionObserver | undefined;

// --- Act Dropdown Logic (modern multi-select with checkboxes) ---
const dropdownBtn = actDropdownBtn;
const dropdownMenu = actDropdownMenu;
const clearBtn = document.getElementById("actClearBtn");

// Toggle menu visibility
dropdownBtn.addEventListener("click", () => {
  dropdownMenu.classList.toggle("hidden");
});

// Close dropdown if user clicks outside
document.addEventListener("click", (e) => {
  if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

// Handle "Select All / Deselect All"
clearBtn.addEventListener("click", () => {
  const checkboxes = dropdownMenu.querySelectorAll("input[type='checkbox']");
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  checkboxes.forEach((cb) => (cb.checked = !allChecked));
  clearBtn.textContent = allChecked ? "Select All" : "Deselect All";
  updateActFilter();
});

// Update filter when any checkbox changes
dropdownMenu.querySelectorAll("input[type='checkbox']").forEach((cb) => {
  cb.addEventListener("change", updateActFilter);
});

// Restore state on load
window.addEventListener("DOMContentLoaded", () => {
  try {
    const savedActs = JSON.parse(localStorage.getItem("currentActFilter")) || [
      1, 2, 3,
    ];
    dropdownMenu.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = savedActs.includes(parseInt(cb.value));
    });
  } catch {
    console.warn("Invalid saved Act filter, resetting to all acts.");
  }
});

// Core update function
async function updateActFilter() {
  const selectedActs = Array.from(
    dropdownMenu.querySelectorAll("input[type='checkbox']:checked"),
  ).map((cb) => parseInt(cb.value));

  // Save selection
  localStorage.setItem("currentActFilter", JSON.stringify(selectedActs));

  console.log("Selected Acts:", selectedActs);
  await reRenderActiveTab(); // 🔁 Update the active tab immediately
}

function getSelectedActs() {
  try {
    const saved = JSON.parse(localStorage.getItem("currentActFilter")) || [
      1, 2, 3,
    ];
    return Array.isArray(saved) ? saved : [1, 2, 3];
  } catch {
    return [1, 2, 3];
  }
}

let currentLoadedSaveData: z.infer<typeof silksongSaveSchema> | undefined;
let currentLoadedSaveDataFlags: Record<string, unknown> | undefined;
let currentLoadedSaveDataMode: Mode | undefined;

/** @type Record<string, (selectedAct?: string) => Promise<void>> */
const TAB_TO_UPDATE_FUNCTION = {
  allprogress: updateAllProgressContent,
  rawsave: updateRawSaveContent,
};
const VALID_TABS = Object.keys(TAB_TO_UPDATE_FUNCTION);

function matchMode(item: Item) {
  const { mode } = item;

  // no mode -> always visible
  if (mode === undefined) {
    return true;
  }

  // BEFORE loading a save -> show all
  if (currentLoadedSaveData === undefined) {
    return true;
  }

  // AFTER loading -> match mode
  return mode === currentLoadedSaveDataMode;
}

// --- Global mutually exclusive groups ---
const EXCLUSIVE_GROUPS = [
  ["Heart Flower", "Heart Coral", "Heart Hunter", "Clover Heart"],
  ["Huntress Quest", "Huntress Quest Runt"], // broodfest runtfeast
];

// ---------- SPOILER TOGGLE ----------
spoilerToggle.addEventListener("change", async () => {
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);
  localStorage.setItem("showSpoilers", spoilerChecked.toString());

  // Use the same filter logic (so it maintains Act + Missing)
  await reRenderActiveTab();
});

function applyMissingFilter() {
  const showMissingOnly = missingToggle.checked;

  document.querySelectorAll(".main-section-block").forEach((section) => {
    assertIs(
      section,
      HTMLDivElement,
      'An element with the "main-section-block" class not was a div element.',
    );

    let hasVisible = false;

    section.querySelectorAll(".boss").forEach((div) => {
      assertIs(
        div,
        HTMLDivElement,
        'An element with the "boss" class not was a div element.',
      );

      if (showMissingOnly) {
        if (div.classList.contains("done")) {
          div.style.display = "none";
        } else {
          div.style.display = "";
          hasVisible = true;
        }
      } else {
        div.style.display = "";
        hasVisible = true;
      }
    });

    // Hide the entire section if it has no visible elements.
    section.style.display = hasVisible ? "" : "none";
  });
}

// ---------- Back to top button listener ----------
document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main");
  assertNotNull(main, "Failed to get the main element.");

  main.addEventListener("scroll", () => {
    const scrollPosition = main.scrollTop;

    if (scrollPosition > 300) {
      backToTop.classList.add("show");
    } else {
      backToTop.classList.remove("show");
    }
  });

  // Scroll back to top.
  backToTop.addEventListener("click", () => {
    main.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  function openUploadModalFunc() {
    uploadOverlay.classList.remove("hidden");
    dropzone.focus();
  }
  function closeUploadModalFunc() {
    uploadOverlay.classList.add("hidden");
  }

  openUploadModal.addEventListener("click", openUploadModalFunc);
  closeUploadModal.addEventListener("click", closeUploadModalFunc);
  uploadOverlay.addEventListener("click", (e) => {
    if (e.target === uploadOverlay) {
      closeUploadModalFunc();
    }
  });

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    }),
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    }),
  );
  dropzone.addEventListener("drop", (dragEvent) => {
    const { dataTransfer } = dragEvent;
    if (dataTransfer === null) {
      return;
    }

    const { files } = dataTransfer;
    const firstFile = files[0];
    handleSaveFile(firstFile);
  });

  /** @type Record<string, string> */
  const paths = {
    windows:
      "%userprofile%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight Silksong",
    mac: "~/Library/Application Support/com.teamcherry.hollowsilksong",
    linux: "~/.config/unity3d/Team Cherry/Hollow Knight Silksong",
    steam:
      "%userprofile%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight Silksong",
  };

  document.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.textContent.trim().toLowerCase();
      const path = paths[key];

      if (!path) {
        if (key === "steam cloud") {
          window.open(
            "https://store.steampowered.com/account/remotestorageapp/?appid=1030300",
            "_blank",
          );
          return;
        }

        showToast("❌ No path available for: " + key);
        return;
      }

      navigator.clipboard
        .writeText(path)
        .then(() => {
          showToast("📋 Path copied to clipboard!");
        })
        .catch((err) => {
          console.error("Clipboard error:", err);
          showToast("⚠️ Unable to copy path.");
        });
    });
  });
});

/**
 * @typedef {{
 *   type?: string,
 *   flag?: string,
 *   relatedFlag?: string,
 *   scene?: string,
 *   required?: number,
 *   subtype?: string,
 *   mode?: string,
 * }} Item
 */

/**
 * @param {z.infer<typeof silksongSaveSchema> | undefined} saveData
 * @param {Record<string, unknown> | undefined} saveDataFlags
 * @param {Item} item
 */
function getSaveDataValue(saveData, saveDataFlags, item) {
  if (saveData === undefined || saveDataFlags === undefined) {
    return undefined;
  }

  const { playerData } = saveData;
  /** @type Record<string, unknown> */
  const playerDataExpanded = playerData;

  const { type, flag, relatedFlag, scene, required, subtype } = item;

  switch (type) {
    case "flag": {
      return flag === undefined ? undefined : playerDataExpanded[flag];
    }

    case "collectable": {
      const { Collectables } = playerData;
      const { savedData } = Collectables;

      const entry = savedData.find((element) => {
        return element.Name === flag;
      });
      if (entry === undefined) {
        return undefined;
      }

      const { Data } = entry;
      const { Amount } = Data;
      return Amount ?? 0;
    }

    case "tool":
    case "toolEquip":
    case "crest": {
      if (flag === undefined) {
        return undefined;
      }

      const normalizedFlag = normalizeString(flag);

      /** @param {z.infer<typeof objectWithSavedData>} object */
      function findIn(object) {
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
      if (flag === undefined) {
        return undefined;
      }
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
      const normalizedScene = normalizeStringWithUnderscores(scene ?? "");
      const normalizedFlag = normalizeStringWithUnderscores(flag ?? "");

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
      if (scene === undefined) {
        return flag === undefined ? false : playerDataExpanded[flag] === true;
      }

      const sceneFlags = saveDataFlags[scene];
      return isObject(sceneFlags) && flag !== undefined
        ? sceneFlags[flag] === true
        : false;
    }

    // Silk Hearts, Memories etc.
    case "sceneVisited": {
      if (item.scene) {
        const scenes = playerData?.scenesVisited || [];
        return scenes.includes(item.scene);
      }

      return false;
    }

    // Numeric progressions (Needle, ToolPouchUpgrades, ToolKitUpgrades, etc.)
    case "level":
    case "min": {
      // ✅ always return the number, unlock is calculated later
      return flag === undefined ? 0 : (playerDataExpanded[flag] ?? 0);
    }

    // e.g. CaravanTroupeLocation >= 2
    case "flagInt": {
      const current = flag === undefined ? 0 : playerDataExpanded[flag];
      return typeof current === "number" ? current >= (required ?? 1) : false;
    }

    case "journal": {
      const { list } = playerData.EnemyJournalKillData;

      const entry = list.find((element) => element.Name === item.flag);
      if (entry === undefined) {
        return false;
      }

      const { Record } = entry;

      if (subtype === "kills") {
        return Record.Kills >= (item.required ?? 1);
      }

      if (subtype === "seen") {
        return Record.HasBeenSeen === true;
      }

      return false;
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
      const normalizedScene = normalizeStringWithUnderscores(scene ?? "");
      const normalizedFlag = normalizeStringWithUnderscores(flag ?? "");

      if (
        relatedFlag !== undefined
        && playerDataExpanded[relatedFlag] === true
      ) {
        return "deposited";
      }

      const sceneFlags = saveDataFlags[normalizedScene];
      if (isObject(sceneFlags) && sceneFlags[normalizedFlag] === true) {
        return "collected";
      }

      return false;
    }

    default: {
      // In certain cases, the type will be undefined.
      return flag === undefined ? undefined : playerDataExpanded[flag];
    }
  }
}

/**
 * Renders a grid of items (bosses, relics, tools, etc.) with their unlock states.
 *
 * @param {Object} options The rendering options.
 * @param {HTMLElement} options.containerEl The container element to render the grid onto.
 * @param {Array<{
 *   id: string,
 *   flag: string,
 *   label: string,
 *   icon?: string,
 *   type: string,
 *   act?: 1 | 2 | 3,
 *   actColor?: string,
 *   missable?: boolean,
 *   required?: number,
 *   [key: string]: unknown,
 * }>} options.data Array of items to render.
 * @param {boolean} options.spoilerOn Whether spoilers are enabled.
 * @returns {number} The number of items rendered.
 */
function renderGenericGrid({ containerEl, data, spoilerOn }) {
  const realContainerId = containerEl?.id || "unknown";

  containerEl.innerHTML = "";

  // 🔎 Silkshot variants (only one card visible)
  const silkVariants = ["WebShot Architect", "WebShot Forge", "WebShot Weaver"];
  const unlockedSilkVariant = silkVariants.find((silkVariant) => {
    if (currentLoadedSaveData === undefined) {
      return false;
    }

    return currentLoadedSaveData.playerData.Tools.savedData.some(
      (tool) => tool.Name === silkVariant && tool.Data["IsUnlocked"] === true,
    );
  });

  // --- Apply mutually exclusive groups (global, relic + quest) ---
  EXCLUSIVE_GROUPS.forEach((group) => {
    const owned = group.find((flag) => {
      // try first as relic
      let value = getSaveDataValue(
        currentLoadedSaveData,
        currentLoadedSaveDataFlags,
        {
          type: "relic",
          flag,
        },
      );

      // if not a valid relic, try as quest
      if (!value || value === false) {
        value = getSaveDataValue(
          currentLoadedSaveData,
          currentLoadedSaveDataFlags,
          { type: "quest", flag },
        );
      }

      return (
        value === "deposited"
        || value === "collected"
        || value === "completed"
        || value === true
      );
    });

    if (owned) {
      data = data.filter(
        (item) => !group.includes(item.flag) || item.flag === owned,
      );
    }
  });

  let renderedCount = 0;

  data.forEach((item) => {
    // Silkshot → show only 1 variant
    if (silkVariants.includes(item.flag)) {
      if (unlockedSilkVariant && item.flag !== unlockedSilkVariant) {
        return;
      }
      if (!unlockedSilkVariant && item.flag !== "WebShot Architect") {
        return;
      }
    }

    const div = document.createElement("div");
    div.className = "boss";

    // Act label (ACT I / II / III)
    if (item.act) {
      const romanActs = { 1: "I", 2: "II", 3: "III" };
      const actLabel = document.createElement("span");
      actLabel.className = `act-label ${item.actColor}`;
      actLabel.textContent = `ACT ${romanActs[item.act]}`;
      div.appendChild(actLabel);
    }

    div.id = `${realContainerId}-${item.id}`;
    div.dataset["flag"] = item.flag;

    const img = document.createElement("img");
    img.alt = item.label;

    // Value from save file (quest can now return "completed" or "accepted")
    const value = getSaveDataValue(
      currentLoadedSaveData,
      currentLoadedSaveDataFlags,
      item,
    );

    let isDone = false;
    let isAccepted = false;

    switch (item.type) {
      case "level":
      case "region-level":
      case "min":
      case "region-min": {
        const current = value === undefined ? 0 : Number(value);
        isDone = current >= (item.required ?? 0);
        break;
      }

      case "collectable": {
        const current = value === undefined ? 0 : Number(value);
        isDone = current > 0;
        break;
      }

      case "quest": {
        isDone = value === "completed" || value === true;
        isAccepted = value === "accepted";
        break;
      }

      case "relic": {
        isDone = value === "deposited";
        isAccepted = value === "collected";
        break;
      }

      case "materium": {
        isDone = value === "deposited";
        isAccepted = value === "collected";
        break;
      }

      case "device": {
        isDone = value === "deposited";
        isAccepted = value === "collected";
        break;
      }

      default: {
        isDone = value === true;
      }
    }

    // If "only missing" and it's completed → don't render the card at all
    const showMissingOnly = missingToggle.checked;
    if (showMissingOnly && isDone) {
      return;
    }

    if (item.missable) {
      const warn = document.createElement("span");
      warn.className = "missable-icon";
      warn.title = "Missable item – can be permanently lost";
      warn.textContent = "!";
      div.appendChild(warn);
    }

    if (item.upgradeOf) {
      const upg = document.createElement("span");
      upg.className = "upgrade-icon";
      upg.title = "Upgraded item";
      upg.textContent = "↑";
      div.appendChild(upg);
    }

    // 🖼️ Image and state management
    const prefix = `${BASE_PATH}/assets`;
    const iconPathSuffix = item.icon || `icons/${item.id}.png`;
    const iconPath = `${prefix}/${iconPathSuffix}`;
    const lockedPath = `${prefix}/icons/locked.png`;

    if (isDone) {
      img.src = iconPath;
      div.classList.add("done");

      // if the item is done, hide missable icon
      const missableIcon = div.querySelector(".missable-icon");
      if (missableIcon !== null) {
        assertIs(
          missableIcon,
          HTMLSpanElement,
          'An element with the "missable-icon" class was not a span element.',
        );

        missableIcon.style.display = "none";
      }
    } else if (isAccepted) {
      img.src = iconPath;
      div.classList.add("accepted");
    } else if (spoilerOn) {
      img.src = iconPath;
      div.classList.add("unlocked");
    } else {
      img.src = lockedPath;
      div.classList.add("locked");

      div.addEventListener("mouseenter", () => (img.src = iconPath));
      div.addEventListener("mouseleave", () => (img.src = lockedPath));
    }

    // Title + modal
    const title = document.createElement("div");
    title.className = "title";
    title.textContent =
      silkVariants.includes(item.flag) && !unlockedSilkVariant
        ? "Silkshot"
        : item.label;

    div.appendChild(img);
    div.appendChild(title);
    div.addEventListener("click", () => showGenericModal(item));

    containerEl.appendChild(div);
    renderedCount++;
  });

  return renderedCount;
}

// ---------- FILE HANDLING ----------
fileInput.addEventListener("change", (event) => {
  const file = fileInput.files?.[0];
  handleSaveFile(file);
});

async function updateRawSaveContent() {
  if (currentLoadedSaveData === undefined) {
    rawSaveOutput.textContent = "⚠️ No save file loaded.";
    return;
  }

  try {
    rawSaveOutput.textContent = JSON.stringify(
      currentLoadedSaveData,
      undefined,
      2,
    );
  } catch (err) {
    rawSaveOutput.textContent = "❌ Failed to display raw save.";
    console.error(err);
  }
}

// --- RAWSAVE TOOLS ---
document.addEventListener("DOMContentLoaded", () => {
  // 📋 Copy JSON
  copyRawsaveBtn.addEventListener("click", () => {
    const text = rawSaveOutput.textContent || "";
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("📋 JSON copied to clipboard!"))
      .catch(() => showToast("⚠️ Copy failed."));
  });

  // 💾 Download JSON
  downloadRawsaveBtn.addEventListener("click", () => {
    if (currentLoadedSaveData === undefined) {
      return showToast("⚠️ No save loaded yet.");
    }
    const blob = new Blob(
      [JSON.stringify(currentLoadedSaveData, undefined, 2)],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "silksong-save.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // 🔍 Navigable search
  let currentMatch = 0;
  let matches = [];

  /** @param {number} index */
  function scrollToMatch(index) {
    const allMarks = rawSaveOutput.querySelectorAll("mark.search-match");
    allMarks.forEach((m) => m.classList.remove("active-match"));
    const lastMark = allMarks[index - 1];
    if (lastMark !== undefined) {
      lastMark.classList.add("active-match");
      lastMark.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    searchCounter.textContent = `${index}/${matches.length}`;
  }

  rawSaveSearch.addEventListener("input", () => {
    const query = rawSaveSearch.value.trim();
    const jsonText = JSON.stringify(currentLoadedSaveData || {}, undefined, 2);
    rawSaveOutput.innerHTML = jsonText;
    matches = [];
    currentMatch = 0;
    searchCounter.textContent = "0/0";
    if (!query) {
      return;
    }

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeQuery, "gi");

    let html = "";
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(jsonText)) !== null) {
      html += jsonText.slice(lastIndex, match.index);
      html += `<mark class="search-match">${match[0]}</mark>`;
      lastIndex = regex.lastIndex;
      matches.push(match.index);
    }
    html += jsonText.slice(lastIndex);
    rawSaveOutput.innerHTML = html;

    if (matches.length > 0) {
      currentMatch = 1;
      scrollToMatch(currentMatch);
    }
    searchCounter.textContent = `${currentMatch}/${matches.length}`;
  });

  nextMatch.addEventListener("click", () => {
    if (matches.length === 0) {
      return;
    }
    currentMatch = (currentMatch % matches.length) + 1;
    scrollToMatch(currentMatch);
  });

  prevMatch.addEventListener("click", () => {
    if (matches.length === 0) {
      return;
    }
    currentMatch = ((currentMatch - 2 + matches.length) % matches.length) + 1;
    scrollToMatch(currentMatch);
  });
});

/** @param {File | undefined } file */
async function handleSaveFile(file) {
  try {
    if (file === undefined) {
      showToast("❌ No file selected.");
      uploadOverlay.classList.remove("hidden");
      return;
    }

    const buffer = await file.arrayBuffer();
    const isDat = file.name.toLowerCase().endsWith(".dat");

    // 🔍 Decode file
    /** @type unknown */
    const saveDataRaw = isDat
      ? decodeSilksongSave(buffer)
      : JSON.parse(new TextDecoder("utf-8").decode(buffer));

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

    // --- Update UI statistics ---
    completionValue.textContent = `${saveData.playerData.completionPercentage}%`;

    const seconds = saveData.playerData.playTime;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    playtimeValue.textContent = `${hours}h ${mins}m`;

    rosariesValue.textContent = saveData.playerData.geo.toString();
    shardsValue.textContent = saveData.playerData.ShellShards.toString();

    // --- Detect game mode ---
    const isSteelSoul = saveData.playerData.permadeathMode === 1;

    // ✅ Save mode globally (after declaration)
    currentLoadedSaveDataMode = isSteelSoul ? "steel" : "normal";

    // 🪶 Show visual banner
    modeBanner.innerHTML = isSteelSoul
      ? `<img src="${BASE_PATH}/assets/icons/Steel_Soul_Icon.png" alt="Steel Soul" class="mode-icon"> STEEL SOUL SAVE LOADED`
      : `NORMAL SAVE LOADED`;
    modeBanner.classList.remove("hidden");
    modeBanner.classList.toggle("steel", isSteelSoul);

    // --- Update active tab ---
    const activeElement = document.querySelector(".sidebar-item.is-active");
    assertNotNull(activeElement, "Failed to get the active element.");
    assertIs(
      activeElement,
      HTMLAnchorElement,
      "The active element was not an HTML anchor element.",
    );

    const activeTab = activeElement.dataset["tab"];
    assertDefined(
      activeTab,
      "Failed to get the name of the active tab from the active element.",
    );

    const func = TAB_TO_UPDATE_FUNCTION[activeTab];
    assertDefined(func, `Failed to find the function for tab: ${activeTab}`);
    await func();

    applyMissingFilter();
    showToast("✅ Save file loaded successfully!");
    uploadOverlay.classList.add("hidden");
  } catch (err) {
    console.error("[save] Decode error:", err);
    showToast(
      "⚠️ Browser permission or file access issue. Please reselect your save file.",
    );
    uploadOverlay.classList.remove("hidden");
  }
}

/**
 * @param {string} message
 */
function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 10px 18px;
    border-radius: 6px;
    font-size: 0.9rem;
    z-index: 9999;
    box-shadow: 0 0 6px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Handle sidebar clicks
document.querySelectorAll(".sidebar-item").forEach((anchor) => {
  assertIs(
    anchor,
    HTMLAnchorElement,
    'An element with a class of "sidebar-item" was not an anchor.',
  );

  anchor.addEventListener("click", async (pointerEvent) => {
    pointerEvent.preventDefault();

    // Remove/add activation class
    document
      .querySelectorAll(".sidebar-item")
      .forEach((i) => i.classList.remove("is-active"));
    anchor.classList.add("is-active");

    // Hide all tabs
    document.querySelectorAll(".tab").forEach((section) => {
      section.classList.add("hidden");
    });

    const selectedTab = anchor.dataset["tab"];
    assertDefined(
      selectedTab,
      "Failed to find the tab corresponding to an anchor element.",
    );

    const activeSectionID = `${selectedTab}-section`;
    const activeSection = document.getElementById(activeSectionID);
    assertNotNull(activeSection, `Failed to get element: ${activeSectionID}`);
    activeSection.classList.remove("hidden");

    // 🔹 Maintain ACT filter state
    let savedActs;
    try {
      savedActs = JSON.parse(localStorage.getItem("currentActFilter")) || [
        "all",
      ];
      if (!Array.isArray(savedActs)) savedActs = ["all"];
    } catch {
      savedActs = ["all"];
    }

    // 🔹 Save active tab
    localStorage.setItem("activeTab", selectedTab);

    // Enable/disable home scroll
    document.documentElement.style.overflowY = "auto";

    const func = TAB_TO_UPDATE_FUNCTION[selectedTab];
    assertDefined(func, `Failed to find the function for tab: ${selectedTab}`);
    await func();
  });
});

window.addEventListener("DOMContentLoaded", () => {
  // 🔹 Restore saved tab and filters
  let savedTab = localStorage.getItem("activeTab");
  if (savedTab === null || !VALID_TABS.includes(savedTab)) {
    const firstValidTab = VALID_TABS[0];
    assertDefined(firstValidTab, "Failed to get the first valid tab.");
    savedTab = firstValidTab;
  }

  const savedAct = localStorage.getItem("currentActFilter") || "all";

  // 🔹 Restore Act filter value
  let savedActs;
  try {
    savedActs = JSON.parse(localStorage.getItem("currentActFilter")) || ["all"];
    if (!Array.isArray(savedActs)) savedActs = ["all"];
  } catch {
    savedActs = ["all"];
  }

  // 🔹 Restore "Show spoilers" state from localStorage
  const savedSpoilerState = localStorage.getItem("showSpoilers");
  if (savedSpoilerState !== null) {
    spoilerToggle.checked = savedSpoilerState === "true";
  }
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);

  // 🔹 Synchronize "Show only missing" state
  missingToggle.checked = localStorage.getItem("showMissingOnly") === "true";

  // 🔹 Reset tab visibility
  document
    .querySelectorAll(".sidebar-item")
    .forEach((i) => i.classList.remove("is-active"));
  document
    .querySelectorAll(".tab")
    .forEach((section) => section.classList.add("hidden"));

  // 🔹 Activate saved tab
  const btn = document.querySelector(`.sidebar-item[data-tab="${savedTab}"]`);
  if (btn) {
    btn.classList.add("is-active");
  }

  const activeSection = document.getElementById(`${savedTab}-section`);
  if (activeSection) {
    activeSection.classList.remove("hidden");
  }

  const func = TAB_TO_UPDATE_FUNCTION[savedTab];
  assertDefined(func, `Failed to find the function for tab: ${savedTab}`);

  // Minimum delay for safety (prevents race with DOM rendering)
  setTimeout(async () => {
    await func();
  }, 50);
});

async function updateAllProgressContent(selectedAct = "all") {
  const spoilerOn = spoilerToggle.checked;
  const showMissingOnly = missingToggle.checked;
  allProgressGrid.innerHTML = "";

  // ✅ Category definitions
  const categories = [
    { title: "Main Progress", data: mainJSON.items },
    { title: "Essential Items", data: essentialsJSON.items },
    { title: "Bosses", data: bossesJSON.items },
    { title: "Completion", data: completionJSON.items },
    { title: "Wishes", data: wishesJSON.items },
  ];

  // ✅ Render all categories
  for (const { title, data } of categories) {
    assertArray(
      data,
      "The contents of one of the JSON files was not an array.",
    );

    const categoryHeader = document.createElement("h2");
    categoryHeader.className = "category-header";
    categoryHeader.textContent = title;
    categoryHeader.style.marginTop = "2rem";
    categoryHeader.style.marginBottom = "1rem";
    allProgressGrid.appendChild(categoryHeader);

    for (const sectionData of data) {
      assertObject(
        sectionData,
        "One of the elements in the JSON array was not an object.",
      );
      const section = document.createElement("div");
      section.className = "main-section-block";

      const heading = document.createElement("h3");
      heading.className = "category-title";
      if (typeof sectionData.label === "string")
        heading.textContent = sectionData.label;

      let items = sectionData.items ?? [];
      assertArray(items, 'The "items" field must be an array.');

      const selectedActs = getSelectedActs();
      let filteredItems = items.filter((item) => {
        if (selectedActs.length === 0 || selectedActs.length === 3)
          return matchMode(item); // "tutti"
        return selectedActs.includes(item.act) && matchMode(item);
      });

      if (showMissingOnly && currentLoadedSaveData) {
        filteredItems = filteredItems.filter((item) => {
          const value = getSaveDataValue(
            currentLoadedSaveData,
            currentLoadedSaveDataFlags,
            item,
          );
          if (item.type === "collectable") return (value ?? 0) === 0;
          if (
            ["level", "min", "region-level", "region-min"].includes(item.type)
          )
            return (value ?? 0) < (item.required ?? 0);
          if (item.type === "quest")
            return value !== "completed" && value !== true;
          return value !== true;
        });
      }

      // === Apply exclusive groups ===
      EXCLUSIVE_GROUPS.forEach((group) => {
        const owned = group.find((flag) => {
          const value = getSaveDataValue(
            currentLoadedSaveData,
            currentLoadedSaveDataFlags,
            { type: "relic", flag },
          );
          return value === "deposited" || value === "collected";
        });
        if (owned) {
          filteredItems = filteredItems.filter(
            (item) => !group.includes(item.flag) || item.flag === owned,
          );
        }
      });

      // === Act colors ===
      filteredItems.forEach((item) => {
        if (item.act === 1) item.actColor = "act-1";
        else if (item.act === 2) item.actColor = "act-2";
        else if (item.act === 3) item.actColor = "act-3";
      });

      // === Counting completion ===
      let obtained = 0;
      const exclusiveGroups = new Set();
      const countedGroups = new Set();

      filteredItems.forEach((item) => {
        if (item.upgradeOf) {
          return;
        }

        const value =
          currentLoadedSaveData === undefined
            ? false
            : getSaveDataValue(
                currentLoadedSaveData,
                currentLoadedSaveDataFlags,
                item,
              );

        const isUnlocked =
          item.type === "quest"
            ? value === "completed" || value === true
            : ["level", "min", "region-level", "region-min"].includes(item.type)
              ? (value ?? 0) >= (item.required ?? 0)
              : item.type === "collectable"
                ? (value ?? 0) > 0
                : value === true
                  || value === "collected"
                  || value === "deposited";

        if (item.exclusiveGroup) {
          exclusiveGroups.add(item.exclusiveGroup);
          if (isUnlocked && !countedGroups.has(item.exclusiveGroup)) {
            countedGroups.add(item.exclusiveGroup);
            obtained++;
          }
        } else {
          obtained += isUnlocked ? 1 : 0;
        }
      });

      const total =
        (filteredItems.filter((i) => !i.exclusiveGroup && !i.upgradeOf).length
          || 0) + exclusiveGroups.size;

      const count = document.createElement("span");
      count.className = "category-count";
      count.textContent = ` ${obtained}/${total}`;
      heading.appendChild(count);
      section.appendChild(heading);

      if (sectionData.desc) {
        const desc = document.createElement("p");
        desc.className = "category-desc";
        desc.textContent = sectionData.desc;
        section.appendChild(desc);
      }

      const subgrid = document.createElement("div");
      subgrid.className = "grid";

      const visible = renderGenericGrid({
        containerEl: subgrid,
        data: filteredItems,
        spoilerOn,
      });

      if (filteredItems.length === 0 || (showMissingOnly && visible === 0))
        continue;

      section.appendChild(subgrid);
      allProgressGrid.appendChild(section);
    }
  }

  // ✅ Build TOC once after all categories are rendered
  buildDynamicTOC();
  initScrollSpy();
}

function buildDynamicTOC() {
  const tocList = document.getElementById("toc-list");
  if (!tocList) return;
  tocList.innerHTML = "";

  const headers = document.querySelectorAll(
    "#allprogress-grid h2, #allprogress-grid h3",
  );
  let currentCategory = null;
  let currentSubList = null;

  headers.forEach((header) => {
    const tag = header.tagName.toLowerCase();
    const text = header.textContent.trim();
    if (!text) return;

    if (!header.id) {
      const cleanId = text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]/g, "");
      header.id = `section-${cleanId}`;
    }

    if (tag === "h2") {
      const li = document.createElement("li");
      li.className = "toc-category";
      li.dataset.manual = "false";

      const a = document.createElement("a");
      a.href = `#${header.id}`;
      a.textContent = text;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(header.id);
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });

        const wasOpen = li.classList.contains("open");
        document.querySelectorAll(".toc-category").forEach((cat) => {
          cat.classList.remove("open");
          cat.querySelector(".toc-sublist")?.classList.add("hidden");
        });
        if (!wasOpen) {
          li.classList.add("open");
          li.querySelector(".toc-sublist")?.classList.remove("hidden");
        }
      });

      li.appendChild(a);
      currentSubList = document.createElement("ul");
      currentSubList.className = "toc-sublist hidden";
      li.appendChild(currentSubList);
      tocList.appendChild(li);
      currentCategory = li;
    } else if (tag === "h3" && currentCategory && currentSubList) {
      const subLi = document.createElement("li");
      subLi.className = "toc-item";
      const a = document.createElement("a");
      a.href = `#${header.id}`;
      a.textContent = text;
      subLi.appendChild(a);
      currentSubList.appendChild(subLi);
    }
  });
}

function initScrollSpy() {
  const tocLinks = document.querySelectorAll(".toc-item a, .toc-category > a");

  // Prevent duplicate observers
  if (tocObserver !== undefined) {
    tocObserver.disconnect();
  }

  tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        const match = document.querySelector(`a[href="#${id}"]`);
        if (!match) return;

        const parentCategory = match.closest(".toc-category");

        if (entry.isIntersecting) {
          tocLinks.forEach((link) => link.classList.remove("active"));
          match.classList.add("active");

          document.querySelectorAll(".toc-category").forEach((cat) => {
            const sub = cat.querySelector(".toc-sublist");
            if (cat === parentCategory) {
              cat.classList.add("open");
              sub?.classList.remove("hidden");
            } else {
              cat.classList.remove("open");
              sub?.classList.add("hidden");
            }
          });
        }
      });
    },
    {
      root: null,
      threshold: 0.6, // 🔹 Serve almeno il 60% visibile
      rootMargin: "-10% 0px -40% 0px", // 🔹 Ritarda leggermente il cambio
    },
  );

  document
    .querySelectorAll("#allprogress-grid h2, #allprogress-grid h3")
    .forEach((section) => tocObserver.observe(section));
}

function showGenericModal(data) {
  // ✅ Full path for map (supports both local and external URLs)
  const mapSrc = data.map
    ? data.map.startsWith("http")
      ? data.map
      : `${BASE_PATH}/${data.map}`
    : null;

  infoContent.innerHTML = `
    <button id="modalCloseBtn" class="modal-close">✕</button>
    <img src="${data.icon}" alt="${data.label}" class="info-image">
    <h2 class="info-title">${data.label}</h2>
    <p class="info-description">
      ${data.description || "No description available."}
    </p>

    ${data.obtain ? `<p class="info-extra"><strong>Obtained:</strong> ${data.obtain}</p>` : ""}
    ${data.cost ? `<p class="info-extra"><strong>Cost:</strong> ${data.cost}</p>` : ""}

    ${
      mapSrc
        ? `
<div class="info-map-wrapper">
  <div class="map-loading-overlay">
    <span class="map-loading-text">Loading map...</span>
  </div>
  <iframe
    src="${mapSrc}"
    class="info-map-embed"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    allowfullscreen
    onload="this.previousElementSibling.remove()">
  </iframe>
</div>

      `
        : ""
    }

    ${
      data.link
        ? `
      <div class="info-link-wrapper">
        <a href="${data.link}" target="_blank" class="info-link">More info →</a>
      </div>
    `
        : ""
    }
  `;

  infoOverlay.classList.remove("hidden");

  // 🔧 attach listener to the *newly created* close button
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      infoOverlay.classList.add("hidden");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 🎬 Info Modal
  closeInfoModal.addEventListener("click", () =>
    infoOverlay.classList.add("hidden"),
  );
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) {
      infoOverlay.classList.add("hidden");
    }
  });
});

async function reRenderActiveTab() {
  const activeElement = document.querySelector(".sidebar-item.is-active");
  assertNotNull(activeElement, "Failed to get the active element.");
  assertIs(
    activeElement,
    HTMLAnchorElement,
    "The active element was not an HTML anchor element.",
  );

  const activeTab = activeElement.dataset["tab"];
  assertDefined(
    activeTab,
    "Failed to get the name of the active tab from the active element.",
  );

  // ✅ Get selected acts (supports multi-select)
  const selectedActs = getSelectedActs();
  const showMissingOnly = missingToggle.checked;

  // ✅ Save current state
  localStorage.setItem("currentActFilter", JSON.stringify(selectedActs));
  localStorage.setItem("showMissingOnly", showMissingOnly.toString());

  const func = TAB_TO_UPDATE_FUNCTION[activeTab];
  assertDefined(
    func,
    `Failed to find the function corresponding to tab: ${activeTab}`,
  );

  // ✅ Re-render the currently active tab
  await func();
}

missingToggle.addEventListener("change", reRenderActiveTab);

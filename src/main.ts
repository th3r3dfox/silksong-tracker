import {
  assertArray,
  assertDefined,
  assertIs,
  assertNotNull,
  assertObject,
  includes,
  isObject,
  parseIntSafe,
} from "complete-common";
import { actDropdownBtn } from "./components/act-filter.ts";
import { BASE_PATH } from "./constants.ts";
import bossesJSON from "./data/bosses.json" with { type: "json" };
import completionJSON from "./data/completion.json" with { type: "json" };
import essentialsJSON from "./data/essentials.json" with { type: "json" };
import mainJSON from "./data/main.json" with { type: "json" };
import wishesJSON from "./data/wishes.json" with { type: "json" };
import {
  actClearBtn,
  actDropdownMenu,
  actDropdownMenuCheckboxes,
  allProgressGrid,
  backToTop,
  closeInfoModal,
  closeUploadModal,
  completionValue,
  copyRawsaveBtn,
  downloadRawsaveBtn,
  dropzone,
  fileInput,
  getHTMLElement,
  getHTMLElements,
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
  sidebarItems,
  spoilerToggle,
  tocList,
  uploadOverlay,
} from "./elements.ts";
import { decodeSilksongSave } from "./save-decoder.ts";
import type { ObjectWithSavedData, SilksongSave } from "./save-parser.ts";
import { getSaveFileFlags, parseSilksongSave } from "./save-parser.ts";
import type { Act } from "./types/Act.ts";
import type { Category } from "./types/Category.ts";
import type { Item } from "./types/Item.ts";
import type { Mode } from "./types/Mode.ts";
import {
  getIconPath,
  normalizeString,
  normalizeStringWithUnderscores,
} from "./utils.ts";

console.log(
  "No cost too great. No mind to think. No will to break. No voice to cry suffering.",
);

let tocObserver: IntersectionObserver | undefined;

const BASE_DUMMY_ITEM = {
  act: 1,
  icon: "",
  id: "",
  label: "",
  link: "",
} as const;

// Toggle menu visibility
actDropdownBtn.addEventListener("click", () => {
  actDropdownMenu.classList.toggle("hidden");
});

// Close dropdown if user clicks outside.
document.addEventListener("click", (event) => {
  const { target } = event;
  if (
    target !== null
    && target instanceof Node
    && !actDropdownBtn.contains(target)
    && !actDropdownMenu.contains(target)
  ) {
    actDropdownMenu.classList.add("hidden");
  }
});

// Handle "Select All / Deselect All".
actClearBtn.addEventListener("click", () => {
  const allChecked = actDropdownMenuCheckboxes.every(
    (checkbox) => checkbox.checked,
  );
  for (const checkbox of actDropdownMenuCheckboxes) {
    checkbox.checked = !allChecked;
  }
  actClearBtn.textContent = allChecked ? "Select All" : "Deselect All";

  updateActFilter();
});

// Update filter when any checkbox changes.
for (const checkbox of actDropdownMenuCheckboxes) {
  checkbox.addEventListener("change", updateActFilter);
}

// Restore state on load.
globalThis.addEventListener("DOMContentLoaded", () => {
  const actFilter = getCurrentActFilter();

  for (const checkbox of actDropdownMenuCheckboxes) {
    const act = parseIntSafe(checkbox.value);
    assertDefined(act, "Failed to parse an act number from a checkbox.");
    if (act !== 1 && act !== 2 && act !== 3) {
      throw new TypeError(`An act checkbox has an invalid value: ${act}`);
    }
    checkbox.checked = actFilter.includes(act);
  }
});

function getCurrentActFilter(): readonly Act[] {
  const localStorageKey = "currentActFilter";

  const defaultActFilter = [1, 2, 3] as const;
  const currentActFilterString = localStorage.getItem(localStorageKey);
  if (currentActFilterString === null) {
    return defaultActFilter;
  }

  try {
    const currentActFilter = JSON.parse(currentActFilterString) as unknown;
    assertArray(
      currentActFilter,
      `The "${localStorageKey}" localStorage value must be an array instead of: ${currentActFilterString}`,
    );

    const arrayValid = currentActFilter.every(
      (act) => act === 1 || act === 2 || act === 3,
    );
    if (!arrayValid) {
      throw new TypeError(
        `The "${localStorageKey}" localStorage value must be an array of valid acts instead of: ${currentActFilterString}`,
      );
    }

    return currentActFilter;
  } catch (error) {
    console.warn(error);
    console.warn(
      `Rewriting the "${localStorageKey}" localStorage value to default.`,
    );
    const defaultActFilterString = JSON.stringify(defaultActFilter);
    localStorage.setItem("currentActFilter", defaultActFilterString);

    return defaultActFilter;
  }
}

// Core update function
function updateActFilter() {
  const checkedCheckboxes = actDropdownMenuCheckboxes.filter(
    (checkbox) => checkbox.checked,
  );
  const selectedActs = checkedCheckboxes.map((checkbox) => {
    const { value } = checkbox;
    const act = parseIntSafe(checkbox.value);
    assertDefined(act, `Failed to parse the value of a checkbox: ${value}`);
    if (act !== 1 && act !== 2 && act !== 3) {
      throw new TypeError(`Invalid act checkbox value: ${value}`);
    }

    return act;
  });

  // Save selection
  const selectedActsString = JSON.stringify(selectedActs);
  localStorage.setItem("currentActFilter", selectedActsString);

  reRenderActiveTab();
}

function updateMapContent() {
  const img = document.querySelector<HTMLImageElement>("#worldMap");
  if (!img) {
    console.error("❌ worldMap not found");
    return;
  }

  const wrapper = img.parentElement;
  if (!(wrapper instanceof HTMLElement)) {
    console.error("❌ Map wrapper not found or not an HTMLElement.");
    return;
  }

  let scale = 1;
  let minScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Apply translation and scaling.
  const updateTransform = () => {
    img.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  // Keep panning centered prevent image from leaving screen.
  const clampPan = () => {
    const rect = wrapper.getBoundingClientRect();

    // Half dimensions of the visible area.
    const halfViewWidth = rect.width / 2;
    const halfViewHeight = rect.height / 2;

    // Half dimensions of the scaled image.
    const halfImageWidth = (img.naturalWidth * scale) / 2;
    const halfImageHeight = (img.naturalHeight * scale) / 2;

    // Calculate allowed translation range (centered).
    const maxX = Math.max(0, halfImageWidth - halfViewWidth);
    const maxY = Math.max(0, halfImageHeight - halfViewHeight);

    translateX = Math.max(-maxX, Math.min(maxX, translateX));
    translateY = Math.max(-maxY, Math.min(maxY, translateY));
  };

  // Fit map to screen automatically.
  const fitToScreen = () => {
    const rect = wrapper.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;

    if (naturalWidth > 0 && naturalHeight > 0) {
      const scaleX = rect.width / naturalWidth;
      const scaleY = rect.height / naturalHeight;

      // Slightly smaller so it fits comfortably.
      scale = Math.min(scaleX, scaleY) * 0.9;
      minScale = scale;
      translateX = 0;
      translateY = 0;
      updateTransform();
    }
  };

  if (img.complete) {
    fitToScreen();
  } else {
    img.addEventListener("load", fitToScreen, { once: true });
  }

  // Zoom with mouse wheel.
  wrapper.addEventListener(
    "wheel",
    (e) => {
      if (isDragging) {
        return;
      }
      e.preventDefault();

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const prevScale = scale;
      const zoomFactor = 1.1;

      scale *= e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      scale = Math.min(Math.max(minScale, scale), 6);

      // Adjust translation to keep the zoom focus point.
      translateX -= mouseX / prevScale - mouseX / scale;
      translateY -= mouseY / prevScale - mouseY / scale;

      clampPan();
      updateTransform();
    },
    { passive: false },
  );

  // Drag to pan.
  wrapper.addEventListener("mousedown", (e) => {
    if (e.button !== 0) {
      return;
    }
    isDragging = true;
    wrapper.style.cursor = "grabbing";
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
  });

  globalThis.addEventListener("mouseup", () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    wrapper.style.cursor = "grab";
  });

  wrapper.addEventListener("mousemove", (e) => {
    if (!isDragging) {
      return;
    }
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;

    clampPan();
    updateTransform();
  });

  // Double-click → reset zoom and recenter.
  wrapper.addEventListener("dblclick", fitToScreen);

  wrapper.style.cursor = "grab";
}

let currentLoadedSaveData: SilksongSave | undefined;
let currentLoadedSaveDataFlags: Record<string, unknown> | undefined;
let currentLoadedSaveDataMode: Mode | undefined;

const TAB_TO_UPDATE_FUNCTION = {
  allprogress: updateAllProgressContent,
  rawsave: updateRawSaveContent,
  map: updateMapContent,
} as const;
const VALID_TABS = Object.keys(TAB_TO_UPDATE_FUNCTION) as ReadonlyArray<
  keyof typeof TAB_TO_UPDATE_FUNCTION
>;
const FIRST_VALID_TAB = VALID_TABS[0];
assertDefined(FIRST_VALID_TAB, "Failed to get the first valid tab.");

function matchMode(item: Item) {
  const { mode } = item;

  // No mode -> always visible.
  if (mode === undefined) {
    return true;
  }

  // BEFORE loading a save -> show all.
  if (currentLoadedSaveData === undefined) {
    return true;
  }

  // AFTER loading -> match mode.
  return mode === currentLoadedSaveDataMode;
}

const EXCLUSIVE_GROUPS = [
  ["Heart Flower", "Heart Coral", "Heart Hunter", "Clover Heart"],
  ["Huntress Quest", "Huntress Quest Runt"], // Broodfest / Runtfeast
] as const;

spoilerToggle.addEventListener("change", () => {
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);
  localStorage.setItem("showSpoilers", spoilerChecked.toString());
  reRenderActiveTab();
});

function applyMissingFilter() {
  const showMissingOnly = missingToggle.checked;

  const mainSectionBlocks = getHTMLElements(document, ".main-section-block");
  for (const section of mainSectionBlocks) {
    assertIs(
      section,
      HTMLDivElement,
      'An element with the "main-section-block" class not was a div element.',
    );

    let hasVisible = false;

    const bosses = getHTMLElements(section, ".boss");
    for (const div of bosses) {
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
    }

    // Hide the entire section if it has no visible elements.
    section.style.display = hasVisible ? "" : "none";
  }
}

// Back to top button listener.
document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main");
  assertNotNull(main, "Failed to get the main element.");

  main.addEventListener("scroll", () => {
    const scrollPosition = main.scrollTop;

    backToTop.classList.toggle("show", scrollPosition > 300);
  });

  // Scroll back to top.
  backToTop.addEventListener("click", () => {
    main.scrollTo({
      top: 0,
      behavior: "instant",
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

  dropzone.addEventListener("click", () => {
    fileInput.click();
  });
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  for (const type of ["dragenter", "dragover"]) {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  }
  for (const type of ["dragleave", "drop"]) {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  }
  dropzone.addEventListener("drop", (dragEvent) => {
    const { dataTransfer } = dragEvent;
    if (dataTransfer === null) {
      return;
    }

    const { files } = dataTransfer;
    const firstFile = files[0];

    // We do not have to await this since it is the last operation in the callback.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    handleSaveFile(firstFile);
  });

  const paths: Record<string, string> = {
    windows: String.raw`%USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight Silksong`,
    mac: "~/Library/Application Support/com.teamcherry.hollowsilksong",
    linux: "~/.config/unity3d/Team Cherry/Hollow Knight Silksong",
    steam: String.raw`%USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight Silksong`,
  };

  const pills = getHTMLElements(document, ".pill");
  for (const btn of pills) {
    btn.addEventListener("click", () => {
      const key = btn.textContent.trim().toLowerCase();
      const path = paths[key];

      if (path === undefined) {
        if (key === "steam cloud") {
          window.open(
            "https://store.steampowered.com/account/remotestorageapp/?appid=1030300",
            "_blank",
          );
          return;
        }

        showToast(`❌ No path available for: ${key}`);
        return;
      }

      navigator.clipboard
        .writeText(path)
        .then(() => {
          showToast("📋 Path copied to clipboard!");
        })
        .catch((error: unknown) => {
          console.error("Clipboard error:", error);
          showToast("⚠️ Unable to copy path.");
        });
    });
  }
});

function getSaveDataValue(
  saveData: SilksongSave | undefined,
  saveDataFlags: Record<string, unknown> | undefined,
  item: Item,
) {
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
        return false;
      }

      const { Record } = entry;

      return Record.Kills >= item.required;
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

/**
 * Renders a grid of items (e.g. bosses, relics, tools, etc.) with their unlock states.
 *
 * @returns The number of items rendered.
 */
function renderGenericGrid(
  containerElement: HTMLElement,
  items: readonly Item[],
  spoilerOn: boolean,
): number {
  containerElement.innerHTML = "";

  // Silkshot variants (only one card visible).
  const silkVariants = ["WebShot Architect", "WebShot Forge", "WebShot Weaver"];
  const unlockedSilkVariant = silkVariants.find((silkVariant) => {
    if (currentLoadedSaveData === undefined) {
      return false;
    }

    return currentLoadedSaveData.playerData.Tools.savedData.some(
      (tool) => tool.Name === silkVariant && tool.Data["IsUnlocked"] === true,
    );
  });

  // Apply mutually exclusive groups (global, relic + quest).
  for (const group of EXCLUSIVE_GROUPS) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const owned = group.find((flag) => {
      // Try first as relic.
      let value = getSaveDataValue(
        currentLoadedSaveData,
        currentLoadedSaveDataFlags,
        {
          ...BASE_DUMMY_ITEM,
          type: "relic",
          flag,
        },
      );

      // If not a valid relic, try as quest.
      if (value === undefined || value === false) {
        value = getSaveDataValue(
          currentLoadedSaveData,
          currentLoadedSaveDataFlags,
          {
            ...BASE_DUMMY_ITEM,
            type: "quest",
            flag,
          },
        );
      }

      return (
        value === "deposited"
        || value === "collected"
        || value === "completed"
        || value === true
      );
    });

    if (owned !== undefined) {
      items = items.filter((item) => {
        const flag = item.type === "sceneVisited" ? undefined : item.flag;
        if (flag === undefined) {
          return false;
        }
        return !includes(group, flag) || flag === owned;
      });
    }
  }

  let renderedCount = 0;

  for (const item of items) {
    const flag = item.type === "sceneVisited" ? undefined : item.flag;

    // Silkshot --> show only 1 variant.
    if (flag !== undefined && silkVariants.includes(flag)) {
      if (unlockedSilkVariant !== undefined && flag !== unlockedSilkVariant) {
        continue;
      }
      if (unlockedSilkVariant === undefined && flag !== "WebShot Architect") {
        continue;
      }
    }

    const div = document.createElement("div");
    div.className = "boss";

    // Act label (ACT I / II / III).
    const romanActs = { 1: "I", 2: "II", 3: "III" };
    const actLabel = document.createElement("span");
    actLabel.className = `act-label act-${item.act}`;
    const romanAct = romanActs[item.act];
    actLabel.textContent = `ACT ${romanAct}`;
    div.append(actLabel);

    div.id = `${containerElement.id}-${item.id}`;
    div.dataset["flag"] = flag;

    const img = document.createElement("img");
    img.alt = item.label;

    // Value from save file (quest can now return "completed" or "accepted").
    const value = getSaveDataValue(
      currentLoadedSaveData,
      currentLoadedSaveDataFlags,
      item,
    );

    let isDone: boolean;
    let isAccepted = false;

    switch (item.type) {
      case "level": {
        const current = value === undefined ? 0 : Number(value);
        isDone = current >= item.required;
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
        break;
      }
    }

    // If "only missing" and it's completed → don't render the card at all.
    const showMissingOnly = missingToggle.checked;
    if (showMissingOnly && isDone) {
      continue;
    }

    if (item.missable === true) {
      const warn = document.createElement("span");
      warn.className = "missable-icon";
      warn.title = "Missable item - can be permanently lost";
      warn.textContent = "!";
      div.append(warn);
    }

    if (item.type === "tool" && item.upgradeOf !== undefined) {
      const upg = document.createElement("span");
      upg.className = "upgrade-icon";
      upg.title = "Upgraded item";
      upg.textContent = "↑";
      div.append(upg);
    }

    // Image and state management.
    const iconPath = getIconPath(item);
    const lockedPath = `${BASE_PATH}/assets/icons/locked.png`;

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

      div.addEventListener("mouseenter", () => {
        img.src = iconPath;
      });
      div.addEventListener("mouseleave", () => {
        img.src = lockedPath;
      });
    }

    // Title + modal
    const title = document.createElement("div");
    title.className = "title";
    title.textContent =
      flag !== undefined
      && silkVariants.includes(flag)
      && unlockedSilkVariant === undefined
        ? "Silkshot"
        : item.label;

    div.append(img);
    div.append(title);
    div.addEventListener("click", () => {
      showGenericModal(item);
    });

    containerElement.append(div);
    renderedCount++;
  }

  return renderedCount;
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];

  // We do not have to await this since it is the last operation in the callback.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleSaveFile(file);
});

function updateRawSaveContent() {
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
  } catch (error) {
    rawSaveOutput.textContent = "❌ Failed to display raw save.";
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Copy JSON
  copyRawsaveBtn.addEventListener("click", () => {
    const text = rawSaveOutput.textContent;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("📋 JSON copied to clipboard!");
      })
      .catch(() => {
        showToast("⚠️ Copy failed.");
      });
  });

  // Download JSON
  downloadRawsaveBtn.addEventListener("click", () => {
    if (currentLoadedSaveData === undefined) {
      showToast("⚠️ No save loaded yet.");
      return;
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

  // Navigable search
  let currentMatch = 0;
  let matches: number[] = [];

  function scrollToMatch(index: number) {
    const allMarks = getHTMLElements(rawSaveOutput, "mark.search-match");
    for (const m of allMarks) {
      m.classList.remove("active-match");
    }
    const lastMark = allMarks[index - 1];
    if (lastMark !== undefined) {
      lastMark.classList.add("active-match");
      lastMark.scrollIntoView({
        behavior: "instant",
        block: "center",
      });
    }
    searchCounter.textContent = `${index}/${matches.length}`;
  }

  rawSaveSearch.addEventListener("input", () => {
    const query = rawSaveSearch.value.trim();
    const jsonText = JSON.stringify(currentLoadedSaveData ?? {}, undefined, 2);
    rawSaveOutput.innerHTML = jsonText;
    matches = [];
    currentMatch = 0;
    searchCounter.textContent = "0/0";
    if (query === "") {
      return;
    }

    const safeQuery = query.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
    const regex = new RegExp(safeQuery, "gi");

    let html = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(jsonText)) !== null) {
      html += jsonText.slice(lastIndex, match.index);
      html += `<mark class="search-match">${match[0]}</mark>`;
      ({ lastIndex } = regex);
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

async function handleSaveFile(file: File | undefined) {
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

    // Update active tab.
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
    if (!includes(VALID_TABS, activeTab)) {
      throw new TypeError(`The active tab was not valid: ${activeTab}`);
    }

    const func = TAB_TO_UPDATE_FUNCTION[activeTab];
    func();

    applyMissingFilter();
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

function showToast(message: string) {
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
  document.body.append(toast);
  setTimeout(() => {
    toast.remove();
  }, 2500);
}

// Handle sidebar clicks
for (const anchor of sidebarItems) {
  assertIs(
    anchor,
    HTMLAnchorElement,
    'An element with a class of "sidebar-item" was not an anchor.',
  );

  anchor.addEventListener("click", (pointerEvent) => {
    pointerEvent.preventDefault();

    // Remove/add activation class
    for (const sidebarItem of sidebarItems) {
      sidebarItem.classList.remove("is-active");
    }
    anchor.classList.add("is-active");

    // Hide all tabs
    const tabs = getHTMLElements(document, ".tab");
    for (const section of tabs) {
      section.classList.add("hidden");
    }

    const selectedTab = anchor.dataset["tab"];
    assertDefined(
      selectedTab,
      "Failed to find the tab corresponding to an anchor element.",
    );
    if (!includes(VALID_TABS, selectedTab)) {
      throw new Error(`The selected tab was not valid: ${selectedTab}`);
    }

    const activeSectionID = `${selectedTab}-section`;
    const activeSection = getHTMLElement(activeSectionID);
    activeSection.classList.remove("hidden");

    localStorage.setItem("activeTab", selectedTab);

    // Enable/disable home scroll
    document.documentElement.style.overflowY = "auto";

    const func = TAB_TO_UPDATE_FUNCTION[selectedTab];
    func();
  });
}

globalThis.addEventListener("DOMContentLoaded", () => {
  // Restore saved tab and filters.
  let activeTab = FIRST_VALID_TAB;
  const storedActiveTab = localStorage.getItem("activeTab");
  if (storedActiveTab !== null && includes(VALID_TABS, storedActiveTab)) {
    activeTab = storedActiveTab;
  }

  // Restore "Show spoilers" state from localStorage.
  const savedSpoilerState = localStorage.getItem("showSpoilers");
  if (savedSpoilerState !== null) {
    spoilerToggle.checked = savedSpoilerState === "true";
  }
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);

  // Synchronize "Show only missing" state.
  missingToggle.checked = localStorage.getItem("showMissingOnly") === "true";

  // Reset tab visibility.
  for (const sidebarItem of sidebarItems) {
    sidebarItem.classList.remove("is-active");
  }
  const tabs = getHTMLElements(document, ".tab");
  for (const section of tabs) {
    section.classList.add("hidden");
  }

  // Activate saved tab.
  const btn = document.querySelector(`.sidebar-item[data-tab="${activeTab}"]`);
  if (btn) {
    btn.classList.add("is-active");
  }

  const activeSection = getHTMLElement(`${activeTab}-section`);
  activeSection.classList.remove("hidden");

  const func = TAB_TO_UPDATE_FUNCTION[activeTab];

  setTimeout(() => {
    func();
  }, 50); // Minimum delay for safety (prevents race with DOM rendering).
});

function updateAllProgressContent() {
  const spoilerOn = spoilerToggle.checked;
  const showMissingOnly = missingToggle.checked;
  allProgressGrid.innerHTML = "";

  const allCategories: Array<{
    title: string;
    categories: Category[];
  }> = [
    { title: "Main Progress", categories: mainJSON.categories as Category[] },
    {
      title: "Essential Items",
      categories: essentialsJSON.categories as Category[],
    },
    { title: "Bosses", categories: bossesJSON.categories as Category[] },
    {
      title: "Completion",
      categories: completionJSON.categories as Category[],
    },
    { title: "Wishes", categories: wishesJSON.categories as Category[] },
  ];

  // Render all categories.
  for (const { title, categories } of allCategories) {
    assertArray(
      categories,
      "The contents of one of the JSON files was not an array.",
    );

    const categoryHeader = document.createElement("h2");
    categoryHeader.className = "category-header";
    categoryHeader.textContent = title;
    categoryHeader.style.marginTop = "2rem";
    categoryHeader.style.marginBottom = "1rem";
    allProgressGrid.append(categoryHeader);

    for (const category of categories) {
      const section = document.createElement("div");
      section.className = "main-section-block";

      const heading = document.createElement("h3");
      heading.className = "category-title";
      heading.textContent = category.label;

      const { items } = category;

      const currentActFilter = getCurrentActFilter();
      let filteredItems = items.filter(
        (item) => currentActFilter.includes(item.act) && matchMode(item),
      );

      if (showMissingOnly && currentLoadedSaveData !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        filteredItems = filteredItems.filter((item) => {
          const value = getSaveDataValue(
            currentLoadedSaveData,
            currentLoadedSaveDataFlags,
            item,
          );

          if (item.type === "collectable") {
            const numberValue = typeof value === "number" ? value : 0;
            return numberValue === 0;
          }

          if (item.type === "level") {
            const numberValue = typeof value === "number" ? value : 0;
            return numberValue < item.required;
          }

          if (item.type === "quest") {
            return value !== "completed" && value !== true;
          }

          return value !== true;
        });
      }

      // Apply exclusive groups.
      for (const group of EXCLUSIVE_GROUPS) {
        const saveData = currentLoadedSaveData;
        const saveDataFlags = currentLoadedSaveDataFlags;
        const owned = group.find((flag) => {
          const value = getSaveDataValue(saveData, saveDataFlags, {
            ...BASE_DUMMY_ITEM,
            type: "relic",
            flag,
          });
          return value === "deposited" || value === "collected";
        });

        if (owned !== undefined) {
          filteredItems = filteredItems.filter((item) => {
            const flag = item.type === "sceneVisited" ? undefined : item.flag;
            if (flag === undefined) {
              return false;
            }
            return !includes(group, flag) || flag === owned;
          });
        }
      }

      // Counting completion.
      let obtained = 0;
      let total = 0;

      const exclusiveGroups = new Set();
      const countedGroups = new Set();

      for (const item of filteredItems) {
        if (item.type === "tool" && item.upgradeOf !== undefined) {
          continue;
        }

        const value =
          currentLoadedSaveData === undefined
            ? false
            : getSaveDataValue(
                currentLoadedSaveData,
                currentLoadedSaveDataFlags,
                item,
              );

        const unlocked = getUnlocked(item, value);

        if (item.type === "tool" && item.exclusiveGroup !== undefined) {
          exclusiveGroups.add(item.exclusiveGroup);
          if (unlocked && !countedGroups.has(item.exclusiveGroup)) {
            countedGroups.add(item.exclusiveGroup);
            obtained++;
          }
        } else {
          obtained += unlocked ? 1 : 0;
        }

        total++;
      }

      total = total - countedGroups.size + exclusiveGroups.size;

      const count = document.createElement("span");
      count.className = "category-count";
      count.textContent = ` ${obtained}/${total}`;
      heading.append(count);

      section.append(heading);

      const desc = document.createElement("p");
      desc.className = "category-desc";
      desc.textContent = category.desc;
      section.append(desc);

      const subgrid = document.createElement("div");
      subgrid.className = "grid";

      const visible = renderGenericGrid(subgrid, filteredItems, spoilerOn);

      if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) {
        continue;
      }

      section.append(subgrid);
      allProgressGrid.append(section);
    }
  }

  // Build TOC once after all categories are rendered.
  buildDynamicTOC();
  initScrollSpy();
}

function getUnlocked(item: Item, value: unknown): boolean {
  if (item.type === "quest") {
    return value === "completed" || value === true;
  }

  if (item.type === "level") {
    const numberValue = typeof value === "number" ? value : 0;
    return numberValue >= item.required;
  }

  if (item.type === "collectable") {
    const numberValue = typeof value === "number" ? value : 0;
    return numberValue > 0;
  }

  return value === true || value === "collected" || value === "deposited";
}

function buildDynamicTOC() {
  tocList.innerHTML = "";

  const headers = getHTMLElements(
    document,
    "#allprogress-grid h2, #allprogress-grid h3",
  );

  let currentCategory: HTMLLIElement | undefined;
  let currentSubList: HTMLUListElement | undefined;

  for (const header of headers) {
    const tag = header.tagName.toLowerCase();
    const text = header.textContent.trim();
    if (text === "") {
      continue;
    }

    if (header.id === "") {
      const cleanId = text
        .toLowerCase()
        .replaceAll(/\s+/g, "-")
        .replaceAll(/[^\w-]/g, "");
      header.id = `section-${cleanId}`;
    }

    if (tag === "h2") {
      const li = document.createElement("li");
      li.className = "toc-category";
      li.dataset["manual"] = "false";

      const a = document.createElement("a");
      a.href = `#${header.id}`;
      a.textContent = text;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = getHTMLElement(header.id);
        target.scrollIntoView({
          behavior: "instant",
          block: "start",
        });

        const wasOpen = li.classList.contains("open");
        const tocCategories = getHTMLElements(document, ".toc-category");
        for (const cat of tocCategories) {
          cat.classList.remove("open");
          cat.querySelector(".toc-sublist")?.classList.add("hidden");
        }
        if (!wasOpen) {
          li.classList.add("open");
          li.querySelector(".toc-sublist")?.classList.remove("hidden");
        }
      });

      li.append(a);
      currentSubList = document.createElement("ul");
      currentSubList.className = "toc-sublist hidden";
      li.append(currentSubList);
      tocList.append(li);
      currentCategory = li;
    } else if (
      tag === "h3"
      && currentCategory !== undefined
      && currentSubList !== undefined
    ) {
      const subLi = document.createElement("li");
      subLi.className = "toc-item";
      const a = document.createElement("a");
      a.href = `#${header.id}`;
      a.textContent = text;
      subLi.append(a);
      currentSubList.append(subLi);
    }
  }
}

function initScrollSpy() {
  const tocLinks = getHTMLElements(document, ".toc-item a, .toc-category > a");

  // Prevent duplicate observers
  if (tocObserver !== undefined) {
    tocObserver.disconnect();
  }

  tocObserver = new IntersectionObserver(
    (entries: readonly IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        const { id } = entry.target;
        const match = document.querySelector(`a[href="#${id}"]`);
        if (match === null) {
          continue;
        }

        const parentCategory = match.closest(".toc-category");

        if (entry.isIntersecting) {
          for (const link of tocLinks) {
            link.classList.remove("active");
          }
          match.classList.add("active");

          const tocCategories = getHTMLElements(document, ".toc-category");
          for (const category of tocCategories) {
            const sublist = category.querySelector(".toc-sublist");
            if (category === parentCategory) {
              category.classList.add("open");
              sublist?.classList.remove("hidden");
            } else {
              category.classList.remove("open");
              sublist?.classList.add("hidden");
            }
          }
        }
      }
    },
    {
      threshold: 0.6, // At least 60% visible is required
      rootMargin: "-10% 0px -40% 0px", // Delays the change slightly
    },
  );

  const headers = getHTMLElements(
    document,
    "#allprogress-grid h2, #allprogress-grid h3",
  );
  for (const section of headers) {
    tocObserver.observe(section);
  }
}

function showGenericModal(item: Item) {
  let mapSrc: string | undefined;
  if (item.map === undefined) {
    mapSrc = undefined;
  } else if (item.map.startsWith("http")) {
    mapSrc = item.map;
  } else {
    mapSrc = `${BASE_PATH}/${item.map}`;
  }

  const iconPath = getIconPath(item);

  infoContent.innerHTML = `
    <button id="modalCloseBtn" class="modal-close">✕</button>
    <img src="${iconPath}" alt="${item.label}" class="info-image">
    <h2 class="info-title">${item.label}</h2>
    <p class="info-description">
      ${item.description}
    </p>

    ${item.type === "level" && item.obtain !== undefined ? `<p class="info-extra"><strong>Obtained:</strong> ${item.obtain}</p>` : ""}
    ${item.type === "level" && item.cost !== undefined ? `<p class="info-extra"><strong>Cost:</strong> ${item.cost}</p>` : ""}

    ${
      mapSrc === undefined
        ? ""
        : `
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
    }

    ${
      item.link === ""
        ? ""
        : `
      <div class="info-link-wrapper">
        <a href="${item.link}" target="_blank" class="info-link">More info →</a>
      </div>
    `
    }
  `;

  infoOverlay.classList.remove("hidden");

  // Attach listener to the *newly created* close button.
  const modalCloseBtn = document.querySelector("#modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      infoOverlay.classList.add("hidden");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Info Modal
  closeInfoModal.addEventListener("click", () => {
    infoOverlay.classList.add("hidden");
  });
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) {
      infoOverlay.classList.add("hidden");
    }
  });
});

function reRenderActiveTab() {
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
  if (!includes(VALID_TABS, activeTab)) {
    throw new TypeError(`The active tab was not valid: ${activeTab}`);
  }

  // Get selected acts (supports multi-select).
  const currentActFilter = getCurrentActFilter();
  const showMissingOnly = missingToggle.checked;

  // Save current state
  localStorage.setItem("currentActFilter", JSON.stringify(currentActFilter));
  localStorage.setItem("showMissingOnly", showMissingOnly.toString());

  const func = TAB_TO_UPDATE_FUNCTION[activeTab];
  func();
}

missingToggle.addEventListener("change", reRenderActiveTab);

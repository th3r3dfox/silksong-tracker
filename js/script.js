// @ts-nocheck

import { z } from "https://cdn.jsdelivr.net/npm/zod@4/+esm";
import {
  actFilter,
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
import { decodeSilksongSave } from "./save-decoder.js";
import {
  getSaveFileFlags,
  parseSilksongSave,
  silksongSaveSchema,
} from "./save-parser.js";
import {
  assertArray,
  assertDefined,
  assertIs,
  assertNotNull,
  assertObject,
  assertString,
  normalizeString,
} from "./utils.js";

console.log(
  "No cost too great. No mind to think. No will to break. No voice to cry suffering.",
);

const BASE_PATH = window.location.pathname.includes("/silksong-tracker/")
  ? "/silksong-tracker"
  : "";
let currentActFilter = actFilter.value || "all";

/** @type z.infer<typeof silksongSaveSchema> | undefined */
let currentLoadedSaveFile;

/** @type Record<string, unknown> | undefined */
let currentLoadedSaveFileFlags;

/** @type {"steel" | "normal" | undefined} */
let currentLoadedSaveFileMode;

/** @type File | undefined */
let lastLoadedSaveFile;

/** @type Record<string, (selectedAct?: string) => Promise<void>> */
const TAB_TO_UPDATE_FUNCTION = {
  allprogress: updateAllProgressContent,
  rawsave: updateRawSaveContent,
};
const VALID_TABS = Object.keys(TAB_TO_UPDATE_FUNCTION);

/** @param {Record<string, string>} item */
function matchMode(item) {
  const { mode } = item;

  // no mode -> always visible
  if (mode === undefined) {
    return true;
  }

  // BEFORE loading a save -> show all
  if (currentLoadedSaveFile !== undefined) {
    return true;
  }

  // AFTER loading -> match mode
  return item["mode"] === currentLoadedSaveFileMode;
}

// --- Global mutually exclusive groups ---
const EXCLUSIVE_GROUPS = [
  ["Heart Flower", "Heart Coral", "Heart Hunter", "Clover Heart"],
  ["Huntress Quest", "Huntress Quest Runt"], // broodfest runtfeast
];

// ---------- SPOILER TOGGLE ----------
spoilerToggle.addEventListener("change", () => {
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);
  localStorage.setItem("showSpoilers", spoilerChecked.toString());

  // Use the same filter logic (so it maintains Act + Missing)
  reRenderActiveTab();
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
    const sectionName =
      section.querySelector("h3")?.textContent?.trim() || "??";

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

    // Hide the entire section if it has no visible elements
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

  // Scroll back to top
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

  // ---------- PILLS COPY ----------
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
 * @param {Record<string, unknown> | undefined} save
 * @param {Record<string, unknown>} item
 */
function resolveSaveValue(save, item) {
  const root = save;
  if (root === undefined) {
    return undefined;
  }

  const playerData = root?.["playerData"] || root; // compat fallback
  assertObject(playerData, "playerData was not an object.");

  const { flag, type } = item;

  switch (type) {
    case "flag": {
      assertString(flag, 'The "flag" property was not a string.');
      return playerData[flag];
    }

    case "collectable": {
      const { Collectables } = playerData;
      assertObject(
        Collectables,
        'The "Collectables" property was not an object.',
      );

      const { savedData } = Collectables;
      assertArray(savedData, 'The "savedData" property was not an array.');

      const entry = savedData.find((element) => {
        assertObject(
          element,
          'One of the elements in the "savedData" array was not an object.',
        );
        return element["Name"] === flag;
      });

      if (entry === undefined) {
        return undefined;
      }

      assertObject(
        entry,
        'The matching entry in the "savedData" array was not an object.',
      );

      const { Data } = entry;
      assertObject(Data, 'The "Data" property was not an object.');

      const { Amount } = Data;
      return Amount ?? 0;
    }

    case "tool":
    case "toolEquip":
    case "crest": {
      if (typeof flag !== "string") {
        return undefined;
      }

      const normalizedFlag = normalizeString(flag);

      const { Tools, ToolEquips } = playerData;
      assertObject(Tools, 'The "Tools" property was not an object.');
      assertObject(ToolEquips, 'The "ToolEquips" property was not an object.');

      const findIn = (/** @type {Record<String, unknown>} */ bucket) => {
        const { savedData } = bucket;
        assertArray(savedData, 'The "savedData" property was not an array.');
        const matchingElement = savedData.find((element) => {
          assertObject(
            element,
            'One of the elements in the "saveData" array was not an object.',
          );
          const { Name } = element;
          assertString(Name, 'The "Name" property was not a string.');
          return normalizeString(Name) === normalizedFlag;
        });

        if (matchingElement === undefined) {
          return undefined;
        }

        assertObject(
          matchingElement,
          'The matching element in the "saveData" array was not an object.',
        );
        return matchingElement;
      };

      const entry = findIn(Tools) ?? findIn(ToolEquips);
      if (entry === undefined) {
        return undefined;
      }

      return entry?.Data?.IsUnlocked === true;
    }

    // Wishes
    case "quest": {
      // Possible data lists for compatibility (some dumps use different names)
      const questLists = [
        playerData.QuestCompletionData?.savedData,
        playerData.Quests?.savedData,
        playerData.QuestsData?.savedData,
        playerData.QuestData?.savedData,
      ].filter(Boolean);

      // Normalize the name to avoid case/space issues
      const flagNorm = normalizeString(item["flag"]);

      // Search in all possible arrays
      let entry;
      for (const list of questLists) {
        entry = list.find((e) => normalizeString(e.Name) === flagNorm);
        if (entry) {
          break;
        }
      }

      if (!entry) {
        return false;
      }

      const data = entry.Data || entry.Record || {};

      // 🎯 Quest status
      if (
        data.IsCompleted === true
        || data.Completed === true
        || data.Complete === true
      ) {
        return "completed";
      }

      if (data.IsAccepted === true || data.Accepted === true) {
        return "accepted";
      }

      return false;
    }

    // Scene flags (Mask Shards, Heart Pieces ecc.)
    case "sceneBool": {
      const scene = String(item.scene || "")
        .trim()
        .replace(/\s+/g, "_");
      const idKey = String(item.flag || "")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w.]/g, "_");

      const val = currentLoadedSaveFileFlags?.[scene]?.[idKey];
      if (val !== undefined) {
        return val;
      }

      if (root[scene]) {
        return (
          root[scene][item.flag]
          ?? root[scene][item.flag.replace(/ /g, "_")]
          ?? false
        );
      }
    }

    case "key": {
      if (item.scene) {
        return currentLoadedSaveFileFlags?.[item.scene]?.[item.flag] === true;
      }
      return playerData[item.flag] === true;
    }

    // Scene visited (Silk Hearts, Memories ecc.)
    case "sceneVisited": {
      if (item.scene) {
        const scenes = save?.playerData?.scenesVisited || [];
        return scenes.includes(item.scene);
      }

      return false;
    }

    // Numeric progressions (Needle, ToolPouchUpgrades, ToolKitUpgrades, etc.)
    case "level":
    case "min": {
      if (item.flag) {
        const current = playerData[item.flag] ?? 0;

        return current; // ✅ always return the number, unlock is calculated later
      }

      return false;
    }

    // Numeric flags (flagInt) — e.g. CaravanTroupeLocation >= 2
    case "flagInt": {
      if (item.flag) {
        const current = playerData[item.flag];
        if (typeof current === "number") {
          const required = item.value ?? item.required ?? 1;
          return current >= required;
        }
        return false;
      }

      return false;
    }

    case "journal": {
      const journalList =
        playerData.EnemyJournalKillData?.list
        || playerData.Journal?.savedData
        || playerData.JournalData?.savedData
        || root.Journal?.savedData
        || [];

      const entry = journalList.find((e) => e.Name === item.flag);
      if (!entry) {
        return false;
      }

      const data = entry.Record || entry.Data || {};

      // Support different conditions
      if (item.subtype === "kills") {
        return (data.Kills ?? 0) >= (item.required ?? 1);
      }

      if (item.subtype === "seen") {
        return data.HasBeenSeen === true;
      }

      if (item.subtype === "unlocked") {
        return data.IsUnlocked === true;
      }

      // fallback
      return data.HasBeenSeen || (data.Kills ?? 0) > 0;
    }

    // Relics (Choral Commandments, Weaver Effigies, Mementos, etc.)
    case "relic": {
      if (item.flag) {
        const relicList =
          save?.Relics?.savedData || save?.playerData?.Relics?.savedData || [];

        const mementoList =
          save?.MementosDeposited?.savedData
          || save?.playerData?.MementosDeposited?.savedData
          || [];

        const combinedList = relicList.concat(mementoList);

        const entry = combinedList.find((e) => e.Name === item.flag);
        if (!entry) {
          return false;
        }

        const data = entry.Data || {};

        if (data.IsDeposited === true) {
          return "deposited"; // ✅ Green
        }

        if (data.HasSeenInRelicBoard === true) {
          return "collected"; // 🟡 Yellow
        }

        if (data.IsCollected === true) {
          return "collected";
        }

        return false;
      }

      return false;
    }

    // ⚡ Materium tracking (seen = green, collected = yellow)
    case "materium": {
      if (item.flag) {
        const list =
          save?.playerData?.MateriumCollected?.savedData
          || save?.MateriumCollected?.savedData
          || [];

        const entry = list.find((e) => e.Name === item.flag);
        if (!entry) {
          return false;
        }

        const data = entry.Data || {};

        // ✅ green if seen in board
        if (data.HasSeenInRelicBoard === true) {
          return "deposited";
        }
        // 🟡 yellow if collected but not seen in board
        if (data.IsCollected === true) {
          return "collected";
        }

        return false;
      }

      return false;
    }

    // Devices (Materium, Farsight, etc.)
    case "device": {
      const scene = String(item.scene || "")
        .trim()
        .replace(/\s+/g, "_");
      const idKey = String(item.flag || "")
        .trim()
        .replace(/\s+/g, "_");
      const depositFlag = String(item.relatedFlag || "").trim();

      // ✅ Green — item deposited
      if (
        depositFlag
        && (save?.playerData?.[depositFlag] === true
          || save?.[depositFlag] === true)
      ) {
        return "deposited";
      }

      // 🟡 Yellow — item collected in scene
      const sceneFlags =
        currentLoadedSaveFileFlags?.[scene] || save?.[scene] || {};

      if (sceneFlags[idKey] === true) {
        return "collected";
      }

      return false;
    }
  }

  // Generic fallback
  if (item.flag && playerData[item.flag] !== undefined) {
    return playerData[item.flag];
  }

  return undefined;
}

function renderGenericGrid({ containerEl, data, spoilerOn }) {
  const realContainerId = containerEl?.id || "unknown";
  const showMissingOnly = missingToggle.checked;

  containerEl.innerHTML = "";

  // 🔎 Silkshot variants (only one card visible)
  const silkVariants = ["WebShot Architect", "WebShot Forge", "WebShot Weaver"];
  const unlockedSilkVariant = silkVariants.find((silkVariant) => {
    if (currentLoadedSaveFile === undefined) {
      return false;
    }

    const { playerData } = currentLoadedSaveFile;
    assertDefined(playerData, 'The "playerData" property does not exist.');
    assertObject(playerData, 'The "playerData" property was not an object.');

    const { Tools } = playerData;
    assertDefined(Tools, 'The "Tools" property does not exist.');
    assertObject(Tools, 'The "Tools" property was not an object.');

    const { savedData } = Tools;
    assertDefined(savedData, 'The "savedData" property does not exist.');
    assertArray(savedData, 'The "savedData" property was not an array.');

    return savedData.some((tool) => {
      assertObject(
        tool,
        'One of the elements in the "savedData" array was not an object.',
      );

      const { Name, Data } = tool;
      assertString(Name, 'The "Name" property was not a string.');
      assertObject(Data, 'The "Data" property was not an object.');

      const { IsUnlocked } = Data;
      return Name === silkVariant && IsUnlocked === true;
    });
  });

  // --- Apply mutually exclusive groups (global, relic + quest) ---
  EXCLUSIVE_GROUPS.forEach((group) => {
    const owned = group.find((flag) => {
      // try first as relic
      let val = resolveSaveValue(currentLoadedSaveFile, {
        type: "relic",
        flag,
      });
      // if not a valid relic, try as quest
      if (!val || val === false) {
        val = resolveSaveValue(currentLoadedSaveFile, { type: "quest", flag });
      }

      return (
        val === "deposited"
        || val === "collected"
        || val === "completed"
        || val === true
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

    // 🔹 Act label (ACT I / II / III)
    if (item.act) {
      const romanActs = { 1: "I", 2: "II", 3: "III" };
      const actLabel = document.createElement("span");
      actLabel.className = `act-label ${item.actColor}`;
      actLabel.textContent = `ACT ${romanActs[item.act]}`;
      div.appendChild(actLabel);
    }

    div.id = `${realContainerId}-${item.id}`;
    div.dataset.flag = item.flag;

    const img = document.createElement("img");
    img.alt = item.label;

    // 🔍 Value from save file (quest can now return "completed" or "accepted")
    const value = resolveSaveValue(currentLoadedSaveFile, item);

    let isDone = false;
    let isAccepted = false;

    if (["level", "region-level", "min", "region-min"].includes(item.type)) {
      isDone = (value ?? 0) >= (item.required ?? 0);
    } else if (item.type === "collectable") {
      isDone = (value ?? 0) > 0;
    } else if (item.type === "quest") {
      isDone = value === "completed" || value === true;
      isAccepted = value === "accepted";
    } else if (item.type === "relic") {
      isDone = value === "deposited"; // green = delivered
      isAccepted = value === "collected"; // yellow = found but not deposited
    } else if (item.type === "materium") {
      // "deposited" = green (done), "collected" = yellow (accepted)
      isDone = value === "deposited";
      isAccepted = value === "collected";
    } else if (item.type === "device") {
      isDone = value === "deposited"; // ✅ Green
      isAccepted = value === "collected"; // 🟡 Yellow
    } else {
      isDone = value === true;
    }

    // If "only missing" and it's completed → don't render the card at all
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

    // 🖼️ Image and state management
    const iconPath = item.icon || `${BASE_PATH}/assets/icons/${item.id}.png`;
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
  if (currentLoadedSaveFile === undefined) {
    rawSaveOutput.textContent = "⚠️ No save file loaded.";
    return;
  }

  try {
    rawSaveOutput.textContent = JSON.stringify(
      currentLoadedSaveFile,
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
    if (currentLoadedSaveFile === undefined) {
      return showToast("⚠️ No save loaded yet.");
    }
    const blob = new Blob(
      [JSON.stringify(currentLoadedSaveFile, undefined, 2)],
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

  function scrollToMatch(index) {
    const allMarks = rawSaveOutput.querySelectorAll("mark.search-match");
    allMarks.forEach((m) => m.classList.remove("active-match"));
    if (allMarks[index - 1]) {
      allMarks[index - 1].classList.add("active-match");
      allMarks[index - 1].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    searchCounter.textContent = `${index}/${matches.length}`;
  }

  rawSaveSearch.addEventListener("input", () => {
    const query = rawSaveSearch.value.trim();
    const jsonText = JSON.stringify(currentLoadedSaveFile || {}, undefined, 2);
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

    // Index and save globally
    currentLoadedSaveFile = saveDataRaw;
    currentLoadedSaveFileFlags = getSaveFileFlags(saveDataRaw);
    lastLoadedSaveFile = file;

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
    currentLoadedSaveFileMode = isSteelSoul ? "steel" : "normal";

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

  anchor.addEventListener("click", (e) => {
    e.preventDefault();

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
    const activeSection = document.getElementById(`${selectedTab}-section`);
    if (activeSection) {
      activeSection.classList.remove("hidden");
    }

    // 🔹 Maintain ACT filter state
    const savedAct = localStorage.getItem("currentActFilter") || "all";
    actFilter.value = savedAct;
    currentActFilter = savedAct;

    // 🔹 Save active tab
    localStorage.setItem("activeTab", selectedTab);

    // Enable/disable home scroll
    document.documentElement.style.overflowY = "auto";

    TAB_TO_UPDATE_FUNCTION[selectedTab]?.(currentActFilter); // <-- apply saved filter
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
  actFilter.value = savedAct;
  currentActFilter = savedAct;

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
  setTimeout(() => {
    func(currentActFilter);
  }, 50);
});

async function updateAllProgressContent(selectedAct = "all") {
  const spoilerOn = spoilerToggle.checked;
  const showMissingOnly = missingToggle.checked;
  allProgressGrid.innerHTML = "";

  // Load all data files
  const [mainData, essentialsData, bossesData, completionData, wishesData] =
    await Promise.all([
      fetch("data/main.json").then((r) => r.json()),
      fetch("data/essentials.json").then((r) => r.json()),
      fetch("data/bosses.json").then((r) => r.json()),
      fetch("data/completion.json").then((r) => r.json()),
      fetch("data/wishes.json").then((r) => r.json()),
    ]);

  // Create section headers and render each category
  const categories = [
    { title: "Main Progress", data: mainData },
    { title: "Essential Items", data: essentialsData },
    {
      title: "Bosses",
      data: bossesData,
    },
    { title: "Completion", data: completionData },
    { title: "Wishes", data: wishesData },
  ];

  categories.forEach(({ title, data }) => {
    assertArray(
      data,
      "The contents of one of the JSON files was not an array.",
    );

    // Create category header
    const categoryHeader = document.createElement("h2");
    categoryHeader.className = "category-header";
    categoryHeader.textContent = title;
    categoryHeader.style.marginTop = "2rem";
    categoryHeader.style.marginBottom = "1rem";
    allProgressGrid.appendChild(categoryHeader);

    // Render sections within this category
    data.forEach((sectionData) => {
      assertObject(
        sectionData,
        "One of the elements in the JSON array was not an object.",
      );

      const section = document.createElement("div");
      section.className = "main-section-block";

      const heading = document.createElement("h3");
      heading.className = "category-title";

      const { label } = sectionData;
      if (typeof label === "string") {
        heading.textContent = label;
      }

      const items = sectionData["items"] ?? [];
      assertArray(
        items,
        'The contents of the "items" field in a JSON file was not an array.',
      );

      let filteredItems = items.filter(
        (item) =>
          (selectedAct === "all" || Number(item.act) === Number(selectedAct))
          && matchMode(item),
      );

      if (showMissingOnly && currentLoadedSaveFile !== undefined) {
        filteredItems = filteredItems.filter((item) => {
          const val = resolveSaveValue(currentLoadedSaveFile, item);
          if (item.type === "collectable") {
            return (val ?? 0) === 0;
          }

          if (
            ["level", "min", "region-level", "region-min"].includes(item.type)
          ) {
            return (val ?? 0) < (item.required ?? 0);
          }

          if (item.type === "quest") {
            return val !== "completed" && val !== true;
          }

          return val !== true;
        });
      }

      // --- Apply mutually exclusive groups (global) ---
      EXCLUSIVE_GROUPS.forEach((group) => {
        const owned = group.find((flag) => {
          const val = resolveSaveValue(currentLoadedSaveFile, {
            type: "relic",
            flag,
          });
          return val === "deposited" || val === "collected";
        });
        if (owned) {
          filteredItems = filteredItems.filter(
            (item) => !group.includes(item.flag) || item.flag === owned,
          );
        }
      });

      // Add act colors
      filteredItems.forEach((item) => {
        if (item.act === 1) {
          item.actColor = "act-1";
        } else if (item.act === 2) {
          item.actColor = "act-2";
        } else if (item.act === 3) {
          item.actColor = "act-3";
        }
      });

      // --- Correct count (with exclusive groups) ---
      let obtained = 0;
      const exclusiveGroups = new Set();
      const countedGroups = new Set();

      // --- Apply mutually exclusive groups (global, relic + quest) ---
      EXCLUSIVE_GROUPS.forEach((group) => {
        const owned = group.find((flag) => {
          // try first as relic
          let val = resolveSaveValue(currentLoadedSaveFile, {
            type: "relic",
            flag,
          });
          // if not a valid relic, try as quest
          if (!val || val === false) {
            val = resolveSaveValue(currentLoadedSaveFile, {
              type: "quest",
              flag,
            });
          }

          return (
            val === "deposited"
            || val === "collected"
            || val === "completed"
            || val === true
          );
        });

        if (owned) {
          filteredItems = filteredItems.filter(
            (item) => !group.includes(item.flag) || item.flag === owned,
          );
        }
      });

      filteredItems.forEach((item) => {
        const val =
          currentLoadedSaveFile === undefined
            ? false
            : resolveSaveValue(currentLoadedSaveFile, item);
        const isUnlocked =
          item.type === "quest"
            ? val === "completed" || val === true
            : item.type === "level"
                || item.type === "min"
                || item.type === "region-level"
                || item.type === "region-min"
              ? (val ?? 0) >= (item.required ?? 0)
              : item.type === "collectable"
                ? (val ?? 0) > 0
                : val === true || val === "collected" || val === "deposited";

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
        (filteredItems.filter((i) => !i.exclusiveGroup).length || 0)
        + exclusiveGroups.size;

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

      if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) {
        return;
      }

      section.appendChild(subgrid);
      allProgressGrid.appendChild(section);
    });
  });
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

  const currentAct = actFilter.value || "all";
  const showMissingOnly = missingToggle.checked;

  // Save states
  localStorage.setItem("currentActFilter", currentAct);
  localStorage.setItem("showMissingOnly", showMissingOnly.toString());

  const func = TAB_TO_UPDATE_FUNCTION[activeTab];
  assertDefined(
    func,
    `Failed to find the function corresponding to tab: ${activeTab}`,
  );

  func(currentAct);
}

missingToggle.addEventListener("change", reRenderActiveTab);
actFilter.addEventListener("change", reRenderActiveTab);

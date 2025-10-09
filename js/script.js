console.log(
  "No cost too great. No mind to think. No will to break. No voice to cry suffering.",
);
const BASE_PATH = window.location.pathname.includes("/silksong-tracker/")
  ? "/silksong-tracker"
  : "";
import { decodeSilksongSave } from "./SaveDecoder.js";
let currentActFilter = document.getElementById("actFilter")?.value || "all";

function matchMode(item) {
  if (!item.mode) return true; // no mode -> always visible
  if (!window.save) return true; // BEFORE loading a save -> show all
  return item.mode === window.saveMode; // AFTER loading -> match mode
}

// --- Gruppi mutualmente esclusivi globali ---
const EXCLUSIVE_GROUPS = [
  ["Heart Flower", "Heart Coral", "Heart Hunter", "Clover Heart"],
  ["Huntress Quest", "Huntress Quest Runt"], //broodfest  runtfeast
];

// ---------- SPOILER TOGGLE ----------
document.getElementById("spoilerToggle").addEventListener("change", () => {
  const spoilerChecked = document.getElementById("spoilerToggle").checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);

  // Salva anche questo stato se vuoi mantenerlo al refresh
  localStorage.setItem("showSpoilers", spoilerChecked);

  // Usa la stessa logica dei filtri (così mantiene Act + Missing)
  reRenderActiveTab();
});

function applyMissingFilter() {
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  document.querySelectorAll(".main-section-block").forEach((section) => {
    let hasVisible = false;
    const sectionName =
      section.querySelector("h3")?.textContent?.trim() || "??";

    section.querySelectorAll(".boss").forEach((el) => {
      if (showMissingOnly) {
        if (el.classList.contains("done")) {
          el.style.display = "none";
        } else {
          el.style.display = "";
          hasVisible = true;
        }
      } else {
        el.style.display = "";
        hasVisible = true;
      }
    });

    // Nascondi l'intera sezione se non ha elementi visibili
    section.style.display = hasVisible ? "" : "none";
  });
}

// ---------- Back to top button listener ----------
document.addEventListener("DOMContentLoaded", () => {
  const backToTop = document.getElementById("backToTop");
  const main = document.querySelector("main");

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
  // ---------- MODAL SETUP ----------
  const overlay = document.getElementById("uploadOverlay");
  const dropzone = document.getElementById("dropzone");
  const openBtn = document.getElementById("openUploadModal");
  const closeBtn = document.getElementById("closeUploadModal");
  const fileInput = document.getElementById("fileInput");

  if (!overlay || !dropzone || !openBtn || !closeBtn || !fileInput) {
    console.warn("[upload modal] Elementi mancanti nel DOM.");
    return;
  }

  function openUploadModal() {
    overlay.classList.remove("hidden");
    dropzone.focus();
  }
  function closeUploadModal() {
    overlay.classList.add("hidden");
  }

  openBtn.addEventListener("click", openUploadModal);
  closeBtn.addEventListener("click", closeUploadModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeUploadModal();
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
  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer?.files;
    if (files && files[0]) handleSaveFile(files[0]);
  });

  // ---------- PILLS COPY ----------
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
          console.error("Errore clipboard:", err);
          showToast("⚠️ Unable to copy path.");
        });
    });
  });
});

function resolveSaveValue(save, item) {
  const root = save;
  const pd = root?.playerData || root; // compat fallback

  if (!root) return undefined;

  // Flag diretti
  if (
    item.type === "flag"
    && item.flag
    && Object.prototype.hasOwnProperty.call(pd, item.flag)
  ) {
    return pd[item.flag];
  }

  // Collectables
  if (item.type === "collectable") {
    const entry = pd.Collectables?.savedData?.find((e) => e.Name === item.flag);
    return entry?.Data?.Amount ?? 0;
  }

  // Tools / Crests (Hunter, Reaper, Wanderer, ecc.)
  if (
    item.type === "tool"
    || item.type === "toolEquip"
    || item.type === "crest"
  ) {
    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const flagNorm = normalize(item.flag);

    const findIn = (bucket) =>
      bucket?.savedData?.find((e) => normalize(e?.Name) === flagNorm);

    const entry = findIn(pd.Tools) || findIn(pd.ToolEquips);

    return entry?.Data?.IsUnlocked === true;
  }

  // Quests (Wishes)
  if (item.type === "quest") {
    // Elenchi possibili di dati per compatibilità (alcuni dump usano nomi diversi)
    const questLists = [
      pd.QuestCompletionData?.savedData,
      pd.Quests?.savedData,
      pd.QuestsData?.savedData,
      pd.QuestData?.savedData,
    ].filter(Boolean);

    // Normalizza il nome per evitare problemi di maiuscole/spazi
    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .trim();
    const flagNorm = normalize(item.flag);

    // Cerca in tutti i possibili array
    let entry;
    for (const list of questLists) {
      entry = list.find((e) => normalize(e.Name) === flagNorm);
      if (entry) break;
    }

    if (!entry) return false;

    const data = entry.Data || entry.Record || {};

    // 🎯 Stato della quest
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
  if (item.type === "sceneBool") {
    const scene = String(item.scene || "")
      .trim()
      .replace(/\s+/g, "_");
    const idKey = String(item.flag || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w.]/g, "_");

    const val = root.__flags?.[scene]?.[idKey];
    if (val !== undefined) return val;

    if (root[scene]) {
      return (
        root[scene][item.flag]
        ?? root[scene][item.flag.replace(/ /g, "_")]
        ?? false
      );
    }
  }

  // Keys
  if (item.type === "key") {
    if (item.scene) {
      return root.__flags?.[item.scene]?.[item.flag] === true;
    }
    return pd[item.flag] === true;
  }

  // Scene visited (Silk Hearts, Memories ecc.)
  if (item.type === "sceneVisited" && item.scene) {
    const scenes = save?.playerData?.scenesVisited || [];
    return scenes.includes(item.scene);
  }

  // Progressioni numeriche (Needle, ToolPouchUpgrades, ToolKitUpgrades, ecc.)
  if ((item.type === "level" || item.type === "min") && item.flag) {
    const current = pd[item.flag] ?? 0;

    return current; // ✅ ritorna SEMPRE il numero, lo sblocco si calcola dopo
  }

  // Flag numerici (flagInt) — es. CaravanTroupeLocation >= 2
  if (item.type === "flagInt" && item.flag) {
    const current = pd[item.flag];
    if (typeof current === "number") {
      const required = item.value ?? item.required ?? 1;
      return current >= required;
    }
    return false;
  }

  if (item.type === "journal") {
    const journalList =
      pd.EnemyJournalKillData?.list
      || pd.Journal?.savedData
      || pd.JournalData?.savedData
      || root.Journal?.savedData
      || [];

    const entry = journalList.find((e) => e.Name === item.flag);
    if (!entry) return false;

    const data = entry.Record || entry.Data || {};

    // Support different conditions
    if (item.subtype === "kills")
      return (data.Kills ?? 0) >= (item.required ?? 1);
    if (item.subtype === "seen") return data.HasBeenSeen === true;
    if (item.subtype === "unlocked") return data.IsUnlocked === true;

    // fallback
    return data.HasBeenSeen || (data.Kills ?? 0) > 0;
  }

  // Relics (Choral Commandments, Weaver Effigies, Mementos, etc.)
  if (item.type === "relic" && item.flag) {
    const relicList =
      save?.Relics?.savedData || save?.playerData?.Relics?.savedData || [];

    const mementoList =
      save?.MementosDeposited?.savedData
      || save?.playerData?.MementosDeposited?.savedData
      || [];

    const combinedList = relicList.concat(mementoList);

    const entry = combinedList.find((e) => e.Name === item.flag);
    if (!entry) return false;

    const data = entry.Data || {};

    if (data.IsDeposited === true) return "deposited"; // ✅ Verde
    if (data.HasSeenInRelicBoard === true) return "collected"; // 🟡 Giallo
    if (data.IsCollected === true) return "collected";

    return false;
  }

  // ⚡ Materium tracking (seen = verde, collected = giallo)
  if (item.type === "materium" && item.flag) {
    const list =
      save?.playerData?.MateriumCollected?.savedData
      || save?.MateriumCollected?.savedData
      || [];

    const entry = list.find((e) => e.Name === item.flag);
    if (!entry) return false;

    const data = entry.Data || {};

    // ✅ verde se visto nella board
    if (data.HasSeenInRelicBoard === true) return "deposited";
    // 🟡 giallo se raccolto ma non visto nella board
    if (data.IsCollected === true) return "collected";

    return false;
  }

  // Devices (Materium, Farsight, ecc.)
  if (item.type === "device") {
    const scene = String(item.scene || "")
      .trim()
      .replace(/\s+/g, "_");
    const idKey = String(item.flag || "")
      .trim()
      .replace(/\s+/g, "_");
    const depositFlag = String(item.relatedFlag || "").trim();

    // ✅ Verde — oggetto depositato
    if (
      depositFlag
      && (save?.playerData?.[depositFlag] === true
        || save?.[depositFlag] === true)
    ) {
      return "deposited";
    }

    // 🟡 Giallo — oggetto raccolto nella scena
    const sceneFlags =
      save?.__flags?.[scene]
      || save?.playerData?.__flags?.[scene]
      || save?.[scene]
      || {};

    if (sceneFlags[idKey] === true) {
      return "collected";
    }

    return false;
  }

  // Fallback generico
  if (item.flag && pd[item.flag] !== undefined) {
    return pd[item.flag];
  }

  return undefined;
}

function renderGenericGrid({
  containerId,
  containerEl,
  data,
  spoilerOn,
  save = window.save,
}) {
  const container = containerEl || document.getElementById(containerId);
  const realContainerId = containerId || container?.id || "unknown";
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  container.innerHTML = "";

  // 🔎 Varianti Silkshot (unica card visibile)
  const silkVariants = ["WebShot Architect", "WebShot Forge", "WebShot Weaver"];
  const unlockedSilkVariant = silkVariants.find((v) =>
    save?.playerData?.Tools?.savedData?.some(
      (e) => e.Name === v && e.Data?.IsUnlocked,
    ),
  );

  // --- Applica gruppi mutualmente esclusivi (globale, relic + quest) ---
  EXCLUSIVE_GROUPS.forEach((group) => {
    const owned = group.find((flag) => {
      // prova prima come relic
      let val = resolveSaveValue(save, { type: "relic", flag });
      // se non è relic valido, prova come quest
      if (!val || val === false)
        val = resolveSaveValue(save, { type: "quest", flag });

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
    // Silkshot → mostra solo 1 variante
    if (silkVariants.includes(item.flag)) {
      if (unlockedSilkVariant && item.flag !== unlockedSilkVariant) return;
      if (!unlockedSilkVariant && item.flag !== "WebShot Architect") return;
    }

    const div = document.createElement("div");
    div.className = "boss";

    // 🔹 Etichetta dell'atto (ACT I / II / III)
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

    // 🔍 Valore dal salvataggio (quest ora può ritornare "completed" o "accepted")
    const value = resolveSaveValue(save, item);

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
      isDone = value === "deposited"; // verde = consegnata
      isAccepted = value === "collected"; // giallo = trovata ma non depositata
    } else if (item.type === "materium") {
      // "deposited" = verde (done), "collected" = giallo (accepted)
      isDone = value === "deposited";
      isAccepted = value === "collected";
    } else if (item.type === "device") {
      isDone = value === "deposited"; // ✅ Verde
      isAccepted = value === "collected"; // 🟡 Giallo
    } else {
      isDone = value === true;
    }

    // Se “solo mancanti” ed è completato → non renderizzare proprio la card
    if (showMissingOnly && isDone) return;

    if (item.missable) {
      const warn = document.createElement("span");
      warn.className = "missable-icon";
      warn.title = "Missable item – can be permanently lost";
      warn.textContent = "!";
      div.appendChild(warn);
    }

    // 🖼️ Gestione immagini e stato
    const iconPath = item.icon || `${BASE_PATH}/assets/icons/${item.id}.png`;
    const lockedPath = `${BASE_PATH}/assets/icons/locked.png`;

    if (isDone) {
      img.src = iconPath;
      div.classList.add("done");

      //if the item is done, hide missble icon
      const missableIcon = div.querySelector(".missable-icon");
      if (missableIcon) missableIcon.style.display = "none";
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

    // Titolo + modal
    const title = document.createElement("div");
    title.className = "title";
    title.textContent =
      silkVariants.includes(item.flag) && !unlockedSilkVariant
        ? "Silkshot"
        : item.label;

    div.appendChild(img);
    div.appendChild(title);
    div.addEventListener("click", () => showGenericModal(item));

    container.appendChild(div);
    renderedCount++;
  });

  return renderedCount;
}

function indexFlags(root) {
  const flags = {};
  const mark = (sceneRaw, idRaw, value) => {
    if (!sceneRaw || !idRaw) return;
    const scene = String(sceneRaw).trim().replace(/\s+/g, "_");
    const idKey = String(idRaw)
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w.]/g, "_");
    if (!flags[scene]) flags[scene] = {};
    flags[scene][idKey] = Boolean(value);
  };

  function walk(node) {
    if (Array.isArray(node)) {
      for (const it of node) walk(it);
      return;
    }
    if (node && typeof node === "object") {
      const hasScene = "SceneName" in node || "sceneName" in node;
      const hasId = "ID" in node || "Id" in node || "id" in node;
      const hasVal = "Value" in node || "value" in node;

      if (hasScene && hasId && hasVal) {
        const scene = node.SceneName ?? node.sceneName;
        const id = node.ID ?? node.Id ?? node.id;
        const val = node.Value ?? node.value;
        mark(scene, id, val);
      }
      for (const k in node) walk(node[k]);
    }
  }

  walk(root);
  root.__flags = flags;
  return root;
}

// ---------- FILE HANDLING ----------
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleSaveFile(file);
});

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function validateSave(obj) {
  return obj && typeof obj === "object" && obj.playerData;
}

function updateRawsaveContent() {
  const container = document.getElementById("rawsave-output");
  if (!container)
    return console.warn("[updateRawsaveContent] Missing #rawsave-output");

  if (!window.save) {
    container.textContent = "⚠️ No save file loaded.";
    return;
  }

  try {
    container.textContent = JSON.stringify(window.save, null, 2);
  } catch (err) {
    container.textContent = "❌ Failed to display raw save.";
    console.error(err);
  }
}

// --- RAWSAVE TOOLS ---
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copyRawsaveBtn");
  const downloadBtn = document.getElementById("downloadRawsaveBtn");
  const searchInput = document.getElementById("rawsave-search");
  const output = document.getElementById("rawsave-output");
  const nextBtn = document.getElementById("nextMatch");
  const prevBtn = document.getElementById("prevMatch");
  const counter = document.getElementById("searchCounter");

  // 📋 Copy JSON
  copyBtn?.addEventListener("click", () => {
    const text = output?.textContent || "";
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("📋 JSON copied to clipboard!"))
      .catch(() => showToast("⚠️ Copy failed."));
  });

  // 💾 Download JSON
  downloadBtn?.addEventListener("click", () => {
    if (!window.save) return showToast("⚠️ No save loaded yet.");
    const blob = new Blob([JSON.stringify(window.save, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "silksong-save.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // 🔍 Ricerca navigabile
  let currentMatch = 0;
  let matches = [];

  function scrollToMatch(index) {
    const allMarks = output.querySelectorAll("mark.search-match");
    allMarks.forEach((m) => m.classList.remove("active-match"));
    if (allMarks[index - 1]) {
      allMarks[index - 1].classList.add("active-match");
      allMarks[index - 1].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    counter.textContent = `${index}/${matches.length}`;
  }

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim();
    const jsonText = JSON.stringify(window.save || {}, null, 2);
    output.innerHTML = jsonText;
    matches = [];
    currentMatch = 0;
    counter.textContent = "0/0";
    if (!query) return;

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
    output.innerHTML = html;

    if (matches.length > 0) {
      currentMatch = 1;
      scrollToMatch(currentMatch);
    }
    counter.textContent = `${currentMatch}/${matches.length}`;
  });

  nextBtn?.addEventListener("click", () => {
    if (matches.length === 0) return;
    currentMatch = (currentMatch % matches.length) + 1;
    scrollToMatch(currentMatch);
  });

  prevBtn?.addEventListener("click", () => {
    if (matches.length === 0) return;
    currentMatch = ((currentMatch - 2 + matches.length) % matches.length) + 1;
    scrollToMatch(currentMatch);
  });
});

// --- Caricamento file principale ---
async function handleSaveFile(file) {
  try {
    if (!file) {
      showToast("❌ No file selected.");
      document.getElementById("uploadOverlay")?.classList.remove("hidden");
      return;
    }

    const buffer = await file.arrayBuffer();
    const isDat = file.name.toLowerCase().endsWith(".dat");

    // 🔍 Decodifica file
    const saveData = isDat
      ? decodeSilksongSave(buffer)
      : JSON.parse(new TextDecoder("utf-8").decode(buffer));

    if (!validateSave(saveData)) {
      showToast("❌ Invalid or corrupted save file");
      document.getElementById("uploadOverlay")?.classList.remove("hidden");
      return;
    }

    document.getElementById("rawsave-output").textContent = JSON.stringify(
      saveData,
      null,
      2,
    );

    // ✅ Indicizza e salva globalmente
    window.save = indexFlags(saveData);
    window.lastSaveFile = file;
    window.lastSaveBuffer = buffer;
    window.lastSaveIsDat = isDat;

    // 🔘 Mostra bottone di refresh
    const refreshBtn = document.getElementById("refreshSaveBtn");
    if (refreshBtn) refreshBtn.classList.remove("hidden");

    // --- Aggiorna statistiche UI ---
    const completion = saveData.playerData?.completionPercentage ?? 0;
    const seconds = saveData.playerData?.playTime ?? 0;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    safeSetText("completionValue", `${completion}%`);
    safeSetText("playtimeValue", `${hours}h ${mins}m`);

    const rosaries = saveData.playerData?.geo ?? 0;
    const shards = saveData.playerData?.ShellShards ?? 0;
    safeSetText("rosariesValue", String(rosaries));
    safeSetText("shardsValue", String(shards));

    // --- Rileva modalità di gioco ---
    const modeValue = saveData.playerData?.permadeathMode ?? 0;
    const isSteelSoul =
      modeValue === 1
      || saveData.playerData?.isSteelSoulMode === true
      || saveData.playerData?.SteelSoulMode === true
      || saveData.playerData?.GameMode === "SteelSoul";

    // ✅ Salva modalità globalmente (dopo la dichiarazione)
    window.saveMode = isSteelSoul ? "steel" : "normal";

    // 🪶 Mostra banner visivo
    const banner = document.getElementById("modeBanner");
    if (banner) {
      banner.innerHTML = isSteelSoul
        ? `<img src="${BASE_PATH}/assets/icons/Steel_Soul_Icon.png" alt="Steel Soul" class="mode-icon"> STEEL SOUL SAVE LOADED`
        : `NORMAL SAVE LOADED`;
      banner.classList.remove("hidden");
      banner.classList.toggle("steel", isSteelSoul);
    }

    // --- Aggiorna la tab attiva ---
    const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset
      .tab;
    const updater = {
      rawsave: updateRawsaveContent,
      allprogress: updateAllProgressContent,
    };
    updater[activeTab]?.();

    applyMissingFilter?.();
    showToast("✅ Save file loaded successfully!");
    document.getElementById("uploadOverlay")?.classList.add("hidden");
  } catch (err) {
    console.error("[save] Decode error:", err);
    showToast(
      "⚠️ Browser permission or file access issue. Please reselect your save file.",
    );
    document.getElementById("uploadOverlay")?.classList.remove("hidden");
  }
}

// --- Refresh manuale ---
async function refreshSaveFile() {
  try {
    if (!window.lastSaveFile) {
      showToast("⚠️ No save file loaded yet.");
      document.getElementById("fileInput").click(); // apre la selezione file
      return;
    }

    // 🔄 Ricarica lo stesso file già in memoria
    showToast("🔄 Reloading save file...");
    await handleSaveFile(window.lastSaveFile);
  } catch (err) {
    console.error("[refreshSaveFile]", err);
    showToast("❌ Failed to refresh save file");
  }
}

// ---------- TOAST ----------
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

// Gestione click sulla sidebar
// Gestione click sulla sidebar
document.querySelectorAll(".sidebar-item").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();

    // Rimuove/aggiunge la classe di attivazione
    document
      .querySelectorAll(".sidebar-item")
      .forEach((i) => i.classList.remove("is-active"));
    btn.classList.add("is-active");

    // Nasconde tutte le tab
    document.querySelectorAll(".tab").forEach((section) => {
      section.classList.add("hidden");
    });

    const selectedTab = btn.dataset.tab;
    const activeSection = document.getElementById(`${selectedTab}-section`);
    if (activeSection) {
      activeSection.classList.remove("hidden");
    }

    // 🔹 Mantieni stato filtro ACT
    const savedAct = localStorage.getItem("currentActFilter") || "all";
    document.getElementById("actFilter").value = savedAct;
    currentActFilter = savedAct;

    // 🔹 Salva tab attiva
    localStorage.setItem("activeTab", selectedTab);

    // Attiva/disattiva home scroll
    document.documentElement.style.overflowY = "auto";

    // 🔹 Aggiorna la tab corrente con il filtro corretto
    const updater = {
      rawsave: updateRawsaveContent,
      allprogress: updateAllProgressContent,
    };

    updater[selectedTab]?.(currentActFilter); // <-- applica il filtro salvato
  });
});

window.addEventListener("DOMContentLoaded", () => {
  // 🔹 Ripristina tab e filtri salvati
  const savedTab = localStorage.getItem("activeTab") || "allprogress";
  const savedAct = localStorage.getItem("currentActFilter") || "all";
  const spoilerToggle = document.getElementById("spoilerToggle");
  const missingToggle = document.getElementById("missingToggle");

  // 🔹 Ripristina valore del filtro Act
  document.getElementById("actFilter").value = savedAct;
  currentActFilter = savedAct;

  // 🔹 Sincronizza stato "Show spoilers" (mantiene i colori coerenti)
  if (spoilerToggle) {
    const spoilerChecked = spoilerToggle.checked;
    document.body.classList.toggle("spoiler-on", !spoilerChecked);
  }

  // 🔹 Sincronizza stato "Show only missing"
  if (missingToggle) {
    missingToggle.checked = localStorage.getItem("showMissingOnly") === "true";
  }

  // 🔹 Reset visibilità tab
  document
    .querySelectorAll(".sidebar-item")
    .forEach((i) => i.classList.remove("is-active"));
  document
    .querySelectorAll(".tab")
    .forEach((section) => section.classList.add("hidden"));

  // 🔹 Attiva la scheda salvata
  const btn = document.querySelector(`.sidebar-item[data-tab="${savedTab}"]`);
  if (btn) btn.classList.add("is-active");

  const activeSection = document.getElementById(`${savedTab}-section`);
  if (activeSection) activeSection.classList.remove("hidden");

  // 🔹 Aggiorna il contenuto della tab (con il filtro dell'atto)
  const updater = {
    rawsave: updateRawsaveContent,
    allprogress: updateAllProgressContent,
  };

  // Delay minimo per sicurezza (previene race con rendering DOM)
  setTimeout(() => {
    updater[savedTab]?.(currentActFilter);
  }, 50);
});

async function updateAllProgressContent(selectedAct = "all") {
  const container = document.getElementById("allprogress-grid");
  if (!container)
    return console.warn(
      "[updateAllProgressContent] Missing #allprogress-grid in DOM",
    );

  const spoilerOn = document.getElementById("spoilerToggle")?.checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;
  container.innerHTML = "";

  // Load all data files
  const [mainData, essentialsData, bossesData, completionData, wishesData] =
    await Promise.all([
      fetch("data/main.json").then((r) => r.json()),
      fetch("data/essentials.json").then((r) => r.json()),
      fetch("data/bosses.json?" + Date.now()).then((r) => r.json()),
      fetch("data/completion.json?" + Date.now()).then((r) => r.json()),
      fetch("data/wishes.json").then((r) => r.json()),
    ]);

  // Create section headers and render each category
  const categories = [
    { title: "Main Progress", data: mainData },
    { title: "Essential Items", data: essentialsData },
    {
      title: "Bosses",
      data: Array.isArray(bossesData) ? bossesData : [bossesData],
    },
    { title: "Completion", data: completionData },
    { title: "Wishes", data: wishesData },
  ];

  categories.forEach(({ title, data }) => {
    // Create category header
    const categoryHeader = document.createElement("h2");
    categoryHeader.className = "category-header";
    categoryHeader.textContent = title;
    categoryHeader.style.marginTop = "2rem";
    categoryHeader.style.marginBottom = "1rem";
    container.appendChild(categoryHeader);

    // Render sections within this category
    data.forEach((sectionData) => {
      const section = document.createElement("div");
      section.className = "main-section-block";

      const heading = document.createElement("h3");
      heading.className = "category-title";
      heading.textContent = sectionData.label;

      // Filter items
      let filteredItems = (sectionData.items || []).filter(
        (item) =>
          (selectedAct === "all" || Number(item.act) === Number(selectedAct))
          && matchMode(item),
      );

      if (showMissingOnly && window.save) {
        filteredItems = filteredItems.filter((item) => {
          const val = resolveSaveValue(window.save, item);
          if (item.type === "collectable") return (val ?? 0) === 0;
          if (
            ["level", "min", "region-level", "region-min"].includes(item.type)
          )
            return (val ?? 0) < (item.required ?? 0);
          if (item.type === "quest") return val !== "completed" && val !== true;
          return val !== true;
        });
      }

      // --- Applica gruppi mutualmente esclusivi (globale) ---
      EXCLUSIVE_GROUPS.forEach((group) => {
        const owned = group.find((flag) => {
          const val = resolveSaveValue(window.save, { type: "relic", flag });
          return val === "deposited" || val === "collected";
        });
        if (owned) {
          filteredItems = filteredItems.filter(
            (item) => !group.includes(item.flag) || item.flag === owned,
          );
        }
      });

      // Aggiungi colori atto
      filteredItems.forEach((item) => {
        if (item.act === 1) item.actColor = "act-1";
        else if (item.act === 2) item.actColor = "act-2";
        else if (item.act === 3) item.actColor = "act-3";
      });

      // --- Conteggio corretto (con gruppi esclusivi) ---
      let obtained = 0;
      const exclusiveGroups = new Set();
      const countedGroups = new Set();

      // --- Applica gruppi mutualmente esclusivi (globale, relic + quest) ---
      EXCLUSIVE_GROUPS.forEach((group) => {
        const owned = group.find((flag) => {
          // prova prima come relic
          let val = resolveSaveValue(window.save, { type: "relic", flag });
          // se non è relic valido, prova come quest
          if (!val || val === false)
            val = resolveSaveValue(window.save, { type: "quest", flag });

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
        const val = window.save ? resolveSaveValue(window.save, item) : false;
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

      if (filteredItems.length === 0 || (showMissingOnly && visible === 0))
        return;

      section.appendChild(subgrid);
      container.appendChild(section);
    });
  });
}

function showGenericModal(data) {
  const overlay = document.getElementById("info-overlay");
  const content = document.getElementById("info-content");

  // ✅ Percorso completo per la mappa (funziona anche su GitHub Pages)
  const mapSrc = data.map
    ? data.map.startsWith("http")
      ? data.map
      : `${BASE_PATH}/${data.map}`
    : null;

  content.innerHTML = `
    <button id="closeInfoModal" class="modal-close">✕</button>
    <img src="${data.icon}" alt="${data.label}" class="info-image">
    <h2 class="info-title">${data.label}</h2>
    <p class="info-description">${data.description || "No description available."}</p>
    ${data.obtain ? `<p class="info-extra"><strong>Obtained:</strong> ${data.obtain}</p>` : ""}
    ${data.cost ? `<p class="info-extra"><strong>Cost:</strong> ${data.cost}</p>` : ""}
    ${
      mapSrc
        ? `
      <div class="info-map-wrapper">
        <a href="${mapSrc}" target="_blank" title="Click to open full map">
          <img src="${mapSrc}" alt="Map location" class="info-map">
        </a>
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

  overlay.classList.remove("hidden");

  document.getElementById("closeInfoModal").addEventListener("click", () => {
    overlay.classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const closeInfo = document.getElementById("closeInfoModal");
  const infoOverlay = document.getElementById("info-overlay");
  const refreshBtn = document.getElementById("refreshSaveBtn");

  // 🎯 Refresh Save
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (typeof refreshSaveFile === "function") {
        refreshSaveFile();
      } else {
        console.warn("refreshSaveFile() not defined yet.");
      }
    });
  }

  // 🎬 Info Modal
  if (closeInfo && infoOverlay) {
    closeInfo.addEventListener("click", () =>
      infoOverlay.classList.add("hidden"),
    );
    infoOverlay.addEventListener("click", (e) => {
      if (e.target === infoOverlay) infoOverlay.classList.add("hidden");
    });
  }
});

function reRenderActiveTab() {
  const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset
    .tab;
  const currentAct = document.getElementById("actFilter")?.value || "all";
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  // Salva stati
  localStorage.setItem("currentActFilter", currentAct);
  localStorage.setItem("showMissingOnly", showMissingOnly);

  const updater = {
    rawsave: updateRawsaveContent,
    allprogress: updateAllProgressContent,
  };

  updater[activeTab]?.(currentAct);
}

document
  .getElementById("missingToggle")
  .addEventListener("change", reRenderActiveTab);
document
  .getElementById("actFilter")
  .addEventListener("change", reRenderActiveTab);

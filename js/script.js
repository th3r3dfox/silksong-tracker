console.log("No cost too great. No mind to think. No will to break. No voice to cry suffering.");
const BASE_PATH = window.location.pathname.includes("/silksong-tracker/")
  ? "/silksong-tracker"
  : "";
import { decodeSilksongSave } from "./SaveDecoder.js";
let currentActFilter = document.getElementById("actFilter")?.value || "all";


// ---------- DATA ----------
let bossList = [];

async function updateBossesContent(selectedAct = "all") {
  const response = await fetch("data/bosses.json?" + Date.now());
  const bossesData = await response.json();

  const spoilerOn = document.getElementById("spoilerToggle")?.checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;
  const container = document.getElementById("boss-grid");
  container.innerHTML = "";

  const sections = Array.isArray(bossesData) ? bossesData : [bossesData];

  sections.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

    // Titolo sezione + conteggio
    const heading = document.createElement("h3");
    heading.className = "category-title";
    heading.textContent = sectionData.label;

    // ✅ 1️⃣ Filtra per act
    let filteredItems = (sectionData.items || []).filter(item =>
      selectedAct === "all" || Number(item.act) === Number(selectedAct)
    );

    // ✅ 2️⃣ Filtra “solo mancanti” (coerente con act)
    if (showMissingOnly && window.save) {
      filteredItems = filteredItems.filter(item => {
        const val = resolveSaveValue(window.save, item);
        if (item.type === "collectable") return (val ?? 0) === 0;
        if (["level", "min", "region-level", "region-min"].includes(item.type))
          return (val ?? 0) < (item.required ?? 0);
        return val !== true;
      });
    }

    // 🔹 Colori atti
    filteredItems.forEach(item => {
      if (item.act === 1) item.actColor = "act-1";
      else if (item.act === 2) item.actColor = "act-2";
      else if (item.act === 3) item.actColor = "act-3";
    });

    // 🔢 Calcolo ottenuti / totali
    let obtained = 0;

    filteredItems.forEach(item => {
      const val = window.save ? resolveSaveValue(window.save, item) : false;
      const isUnlocked =
        (item.type === "level" || item.type === "min" ||
         item.type === "region-level" || item.type === "region-min")
          ? (val ?? 0) >= (item.required ?? 0)
          : item.type === "collectable"
            ? (val ?? 0) > 0
            : (val === true || val === "collected" || val === "deposited");
      if (isUnlocked) obtained++;
    });

    const total = filteredItems.length;

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
      spoilerOn
    });

    // se non ci sono elementi visibili, non aggiungere la sezione
    if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
}



// ---------- SPOILER TOGGLE ----------
document.getElementById("spoilerToggle").addEventListener("change", () => {
  const spoilerChecked = document.getElementById("spoilerToggle").checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);

  // Salva anche questo stato se vuoi mantenerlo al refresh
  localStorage.setItem("showSpoilers", spoilerChecked);

  // Usa la stessa logica dei filtri (così mantiene Act + Missing)
  reRenderActiveTab();
});


function updateIcons() {
  const spoilerOn = document.getElementById("spoilerToggle").checked;
  renderGenericGrid({
    containerId: "boss-grid",
    data: bossList,
    spoilerOn
  });
}




//  document.getElementById("missingToggle").addEventListener("change", applyMissingFilter);

function applyMissingFilter() {
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  document.querySelectorAll(".main-section-block").forEach(section => {
    let hasVisible = false;
    const sectionName = section.querySelector("h3")?.textContent?.trim() || "??";

    section.querySelectorAll(".boss").forEach(el => {
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




async function updateNewTabContent(selectedAct = "all") {
  const response = await fetch("data/essentials.json");
  const newtabData = await response.json();

  const spoilerOn = document.getElementById("spoilerToggle")?.checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;
  const container = document.getElementById("essentials-grid");
  container.innerHTML = "";

  newtabData.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

    const heading = document.createElement("h3");
    heading.className = "category-title";
    heading.textContent = sectionData.label;

    // ✅ Filtra per act e mancanti
    let filteredItems = (sectionData.items || []).filter(item =>
      selectedAct === "all" || Number(item.act) === Number(selectedAct)
    );

    if (showMissingOnly && window.save) {
      filteredItems = filteredItems.filter(item => {
        const val = resolveSaveValue(window.save, item);
        if (item.type === "collectable") return (val ?? 0) === 0;
        if (["level", "min", "region-level", "region-min"].includes(item.type))
          return (val ?? 0) < (item.required ?? 0);
        return val !== true;
      });
    }

    // 🔹 Colori atti
    filteredItems.forEach(item => {
      if (item.act === 1) item.actColor = "act-1";
      else if (item.act === 2) item.actColor = "act-2";
      else if (item.act === 3) item.actColor = "act-3";
    });

    // 🔢 Conteggio ottenuti / totali
    let obtained = 0;
    const exclusiveGroups = new Set();
    const countedGroups = new Set();

    filteredItems.forEach(item => {
      const val = window.save ? resolveSaveValue(window.save, item) : false;
      const isUnlocked =
        (item.type === "level" || item.type === "min" ||
         item.type === "region-level" || item.type === "region-min")
          ? (val ?? 0) >= (item.required ?? 0)
          : item.type === "collectable"
            ? (val ?? 0) > 0
            : (val === true || val === "collected" || val === "deposited");

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
      (filteredItems.filter(i => !i.exclusiveGroup).length || 0) +
      exclusiveGroups.size;

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
      spoilerOn
    });

    if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
}





document.addEventListener("DOMContentLoaded", () => {
  updateBossesContent();

  // ---------- MODAL SETUP ----------
  const overlay  = document.getElementById("uploadOverlay");
  const dropzone = document.getElementById("dropzone");
  const openBtn  = document.getElementById("openUploadModal");
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

  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", e => {
    const files = e.dataTransfer?.files;
    if (files && files[0]) handleSaveFile(files[0]);
  });

  // ---------- PILLS COPY ----------
  const paths = {
    windows: "%userprofile%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight Silksong",
    mac: "~/Library/Application Support/com.teamcherry.hollowsilksong",
    linux: "~/.config/unity3d/Team Cherry/Hollow Knight Silksong",
    steam: "%userprofile%\\AppData\\LocalLow\\Team Cherry\\Hollow Knight Silksong"
  };

  document.querySelectorAll(".pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.textContent.trim().toLowerCase();
      const path = paths[key];

      if (!path) {
  if (key === "steam cloud") {
    window.open("https://store.steampowered.com/account/remotestorageapp/?appid=1030300", "_blank");
    return;
  }

  showToast("❌ No path available for: " + key);
  return;
}

      navigator.clipboard.writeText(path).then(() => {
        showToast("📋 Path copied to clipboard!");
      }).catch(err => {
        console.error("Errore clipboard:", err);
        showToast("⚠️ Unable to copy path.");
      });
    });
  });
});

function resolveSaveValue(save, item) {
  const root = save;
  const pd   = root?.playerData || root; // compat fallback

  if (!root) return undefined;

  // Flag diretti
  if (item.type === "flag" && item.flag && Object.prototype.hasOwnProperty.call(pd, item.flag)) {
    return pd[item.flag];
  }

  // Collectables
  if (item.type === "collectable") {
    const entry = pd.Collectables?.savedData?.find(e => e.Name === item.flag);
    return entry?.Data?.Amount ?? 0;
  }

  

  // Tools / Crests (Hunter, Reaper, Wanderer, ecc.)
  if (item.type === "tool" || item.type === "toolEquip" || item.type === "crest") {
    const normalize = s => String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    const flagNorm = normalize(item.flag);

    const findIn = bucket =>
      bucket?.savedData?.find(e => normalize(e?.Name) === flagNorm);

    const entry =
      findIn(pd.Tools) ||
      findIn(pd.ToolEquips);

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
  const normalize = s => String(s || "").toLowerCase().trim();
  const flagNorm = normalize(item.flag);

  // Cerca in tutti i possibili array
  let entry;
  for (const list of questLists) {
    entry = list.find(e => normalize(e.Name) === flagNorm);
    if (entry) break;
  }

  if (!entry) return false;

  const data = entry.Data || entry.Record || {};

  // 🎯 Stato della quest
  if (data.IsCompleted === true || data.Completed === true || data.Complete === true) {
    return "completed";
  }

  if (data.IsAccepted === true || data.Accepted === true) {
    return "accepted";
  }

  return false;
}



  // Scene flags (Mask Shards, Heart Pieces ecc.)
  if (item.type === "sceneBool") {
    const scene = String(item.scene || "").trim().replace(/\s+/g, "_");
    const idKey = String(item.flag  || "").trim().replace(/\s+/g, "_").replace(/[^\w.]/g, "_");

    const val = root.__flags?.[scene]?.[idKey];
    if (val !== undefined) return val;

    if (root[scene]) {
      return root[scene][item.flag] ??
             root[scene][item.flag.replace(/ /g, "_")] ??
             false;
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
    pd.EnemyJournalKillData?.list ||
    pd.Journal?.savedData ||
    pd.JournalData?.savedData ||
    root.Journal?.savedData ||
    [];

  const entry = journalList.find(e => e.Name === item.flag);
  if (!entry) return false;

  const data = entry.Record || entry.Data || {};

  // Support different conditions
  if (item.subtype === "kills") return (data.Kills ?? 0) >= (item.required ?? 1);
  if (item.subtype === "seen") return data.HasBeenSeen === true;
  if (item.subtype === "unlocked") return data.IsUnlocked === true;

  // fallback
  return data.HasBeenSeen || (data.Kills ?? 0) > 0;
}

  // Relics (Choral Commandments, Weaver Effigies, etc.)
  if (item.type === "relic" && item.flag) {
    const list = save?.Relics?.savedData || save?.playerData?.Relics?.savedData || [];
    const entry = list.find(e => e.Name === item.flag);
    if (!entry) return false;

    const data = entry.Data || {};

    if (data.IsDeposited === true) return "deposited";
    if (data.IsCollected === true) return "collected";

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
  save = window.save
}) {
  const container = containerEl || document.getElementById(containerId);
  const realContainerId = containerId || container?.id || "unknown";
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  container.innerHTML = "";

  // 🔎 Varianti Silkshot (unica card visibile)
  const silkVariants = ["WebShot Architect", "WebShot Forge", "WebShot Weaver"];
  const unlockedSilkVariant = silkVariants.find(v =>
    save?.playerData?.Tools?.savedData?.some(e => e.Name === v && e.Data?.IsUnlocked)
  );

  let renderedCount = 0;

  data.forEach(item => {
    // Silkshot → mostra solo 1 variante
    if (silkVariants.includes(item.flag)) {
      if (unlockedSilkVariant && item.flag !== unlockedSilkVariant) return;
      if (!unlockedSilkVariant && item.flag !== "WebShot Architect") return;
    }

    const div = document.createElement("div");
    div.className = "boss";

// 🔹 Etichetta dell'atto (ACT I / II / III)
if (item.act) {
  const romanActs = {1: "I", 2: "II", 3: "III"};
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
    } 
    else if (item.type === "relic") {
  isDone = value === "deposited";     // verde = consegnata
  isAccepted = value === "collected"; // giallo = trovata ma non depositata
    }else {
      isDone = value === true;
    }

    // Se “solo mancanti” ed è completato → non renderizzare proprio la card
    if (showMissingOnly && isDone) return;

    // 🖼️ Gestione immagini e stato
    const iconPath = item.icon || `${BASE_PATH}/assets/icons/${item.id}.png`;
    const lockedPath = `${BASE_PATH}/assets/icons/locked.png`;

    if (isDone) {
      img.src = iconPath;
      div.classList.add("done");
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









function indexFlags(root){
  const flags = {};
  const mark = (sceneRaw, idRaw, value) => {
    if (!sceneRaw || !idRaw) return;
    const scene = String(sceneRaw).trim().replace(/\s+/g,'_');
    const idKey = String(idRaw).trim()
      .replace(/\s+/g,'_')
      .replace(/[^\w.]/g,'_');
    if (!flags[scene]) flags[scene] = {};
    flags[scene][idKey] = Boolean(value);
  };

  function walk(node){
    if (Array.isArray(node)){ for (const it of node) walk(it); return; }
    if (node && typeof node === 'object'){
      const hasScene = ('SceneName' in node) || ('sceneName' in node);
      const hasId    = ('ID' in node)        || ('Id' in node) || ('id' in node);
      const hasVal   = ('Value' in node)     || ('value' in node);

      if (hasScene && hasId && hasVal){
        const scene = node.SceneName ?? node.sceneName;
        const id    = node.ID ?? node.Id ?? node.id;
        const val   = node.Value ?? node.value;
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
document.getElementById("fileInput").addEventListener("change", e => {
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

// --- Caricamento file principale ---
async function handleSaveFile(fileOrHandle) {
  try {
    let file, buffer, isDat;

    // 🔹 Se riceviamo un FileSystemFileHandle (nuova API)
    if (fileOrHandle && fileOrHandle.getFile) {
      file = await fileOrHandle.getFile();
      window.lastFileHandle = fileOrHandle; // salva il riferimento persistente
    } else {
      // 🔹 Altrimenti è un normale File (da input)
      file = fileOrHandle;
    }

    if (!file) {
      showToast("❌ No file selected.");
      return;
    }

    buffer = await file.arrayBuffer();
    isDat = file.name.toLowerCase().endsWith(".dat");

    // 🔍 Decodifica file
    const saveData = isDat
      ? decodeSilksongSave(buffer)
      : JSON.parse(new TextDecoder("utf-8").decode(buffer));

    if (!validateSave(saveData)) {
      showToast("❌ Invalid or corrupted save file");
      return;
    }

    // ✅ Indicizza e salva globalmente
    window.save = indexFlags(saveData);
    window.lastSaveFile = file;
    window.lastSaveBuffer = buffer;
    window.lastSaveIsDat = isDat;

    // 🔒 Se il browser supporta File System Access, chiedi permesso e memorizza l’handle
    if (!window.lastFileHandle && "showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "Silksong Save", accept: { "application/octet-stream": [".dat"] } }],
        });
        window.lastFileHandle = handle;
      } catch (err) {
        console.warn("User cancelled or API not supported:", err);
      }
    }

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

    // --- Aggiorna la tab attiva ---
    const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset.tab;
    const updater = {
      bosses: updateBossesContent,
      main: updateMainContent,
      essentials: updateNewTabContent,
      wishes: updateWishesContent,
      completion: updateCompletionContent,
    };
    updater[activeTab]?.();

    applyMissingFilter?.();
    showToast("✅ Save file loaded successfully!");
    document.getElementById("uploadOverlay").classList.add("hidden");

  } catch (err) {
    console.error("[save] Decode error:", err);
    showToast("❌ Failed to decode Silksong save file");
  }
}


async function refreshSaveFile() {
  try {
    if (window.lastFileHandle) {
      // ✅ Legge di nuovo il file direttamente dal disco
      const file = await window.lastFileHandle.getFile();
      const buffer = await file.arrayBuffer();
      const isDat = file.name.toLowerCase().endsWith(".dat");

      const saveData = isDat
        ? decodeSilksongSave(buffer)
        : JSON.parse(new TextDecoder("utf-8").decode(buffer));

      window.save = indexFlags(saveData);

      const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset.tab;
      const updater = {
        bosses: updateBossesContent,
        main: updateMainContent,
        essentials: updateNewTabContent,
        wishes: updateWishesContent,
        completion: updateCompletionContent,
      };
      updater[activeTab]?.();

      applyMissingFilter?.();
      showToast("✅ Save refreshed from disk!");
      return;
    }

    // 🧩 fallback per browser che non supportano la nuova API
    if (window.lastSaveFile) {
      showToast("📂 Browser limitation — please reselect your save file.");
      document.getElementById("fileInput").click();
    } else {
      showToast("⚠️ No save file loaded yet.");
    }

  } catch (err) {
    console.error("[refreshSaveFile]", err);
    showToast("❌ Failed to refresh save file");
  }
}






async function updateCompletionContent(selectedAct = "all") {
  const container = document.getElementById("completion-grid");
  if (!container) return console.warn("[updateCompletionContent] Missing #completion-grid in DOM");

  // 📦 Carica il file JSON
  const response = await fetch("data/completion.json?" + Date.now());
  const completionData = await response.json();

  const spoilerOn = document.getElementById("spoilerToggle")?.checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;
  container.innerHTML = "";

  completionData.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

    // 🏷️ Titolo sezione
    const heading = document.createElement("h3");
    heading.className = "category-title";
    heading.textContent = sectionData.label;

    // 🔢 Calcolo ottenuti / totali
    let obtained = 0;
    let total = 0;

    const filteredItems = (sectionData.items || []).filter(item => {
      if (selectedAct !== "all" && Number(item.act) !== Number(selectedAct)) return false;
      if (!window.save) return true;

      const val = resolveSaveValue(window.save, item);

      // Filtra solo mancanti se richiesto
      if (showMissingOnly) {
        if (item.type === "collectable") return (val ?? 0) === 0;
        if (["level", "min", "region-level", "region-min"].includes(item.type))
          return (val ?? 0) < (item.required ?? 0);
        return val !== true;
      }

      return true;
    });

    filteredItems.forEach(item => {
      const val = window.save ? resolveSaveValue(window.save, item) : false;
      const isUnlocked =
        item.type === "collectable" ? (val ?? 0) > 0 :
        ["level", "min", "region-level", "region-min"].includes(item.type)
          ? (val ?? 0) >= (item.required ?? 0)
          : (val === true || val === "collected" || val === "deposited");

      if (isUnlocked) obtained++;
      total++;
    });

    // 📊 Mostra conteggio progressi
    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = ` ${obtained}/${total}`;
    heading.appendChild(count);
    section.appendChild(heading);

    // 🧾 Descrizione
    if (sectionData.desc) {
      const desc = document.createElement("p");
      desc.className = "category-desc";
      desc.textContent = sectionData.desc;
      section.appendChild(desc);
    }

    // 🧱 Griglia interna
    const subgrid = document.createElement("div");
    subgrid.className = "grid";

    const visible = renderGenericGrid({
      containerEl: subgrid,
      data: filteredItems,
      spoilerOn
    });

    if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
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
document.querySelectorAll(".sidebar-item").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();

    // Rimuove/aggiunge la classe di attivazione
    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("is-active"));
    btn.classList.add("is-active");

    // Nasconde tutte le tab
    document.querySelectorAll(".tab").forEach(section => {
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
    document.body.classList.toggle("home-active", selectedTab === "home");
    document.documentElement.style.overflowY = selectedTab === "home" ? "hidden" : "auto";

    // 🔹 Aggiorna la tab corrente con il filtro corretto
    const updater = {
      bosses: updateBossesContent,
      main: updateMainContent,
      essentials: updateNewTabContent,
      wishes: updateWishesContent,
      completion: updateCompletionContent,
    };

    updater[selectedTab]?.(currentActFilter); // <-- applica il filtro salvato
  });
});



// ✅ Aggiunta: set home-active al primo caricamento se siamo su home
window.addEventListener("DOMContentLoaded", () => {
  // 🔹 Ripristina tab e filtri salvati
  const savedTab = localStorage.getItem("activeTab") || "home";
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
  document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("is-active"));
  document.querySelectorAll(".tab").forEach(section => section.classList.add("hidden"));

  // 🔹 Attiva la scheda salvata
  const btn = document.querySelector(`.sidebar-item[data-tab="${savedTab}"]`);
  if (btn) btn.classList.add("is-active");

  const activeSection = document.getElementById(`${savedTab}-section`);
  if (activeSection) activeSection.classList.remove("hidden");

  // 🔹 Applica la classe home-active se serve
  document.body.classList.toggle("home-active", savedTab === "home");

  // 🔹 Aggiorna il contenuto della tab (con il filtro dell'atto)
  const updater = {
    bosses: updateBossesContent,
    main: updateMainContent,
    essentials: updateNewTabContent,
    wishes: updateWishesContent,
    completion: updateCompletionContent,
  };

  // Delay minimo per sicurezza (previene race con rendering DOM)
  setTimeout(() => {
    updater[savedTab]?.(currentActFilter);
  }, 50);
});



async function updateMainContent(selectedAct = "all") {
  const response = await fetch("data/main.json");
  const mainData = await response.json();

  const spoilerOn = document.getElementById("spoilerToggle")?.checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;
  const container = document.getElementById("main-grid");
  container.innerHTML = "";

  mainData.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

    const heading = document.createElement("h3");
    heading.className = "category-title";
    heading.textContent = sectionData.label;

    // ✅ Filtra per act e solo mancanti
    let filteredItems = (sectionData.items || []).filter(item =>
      selectedAct === "all" || Number(item.act) === Number(selectedAct)
    );

    if (showMissingOnly && window.save) {
      filteredItems = filteredItems.filter(item => {
        const val = resolveSaveValue(window.save, item);
        if (item.type === "collectable") return (val ?? 0) === 0;
        if (["level", "min", "region-level", "region-min"].includes(item.type))
          return (val ?? 0) < (item.required ?? 0);
        return val !== true;
      });
    }

    // 🔹 Colori atti
    filteredItems.forEach(item => {
      if (item.act === 1) item.actColor = "act-1";
      else if (item.act === 2) item.actColor = "act-2";
      else if (item.act === 3) item.actColor = "act-3";
    });

    // 🔢 Calcolo ottenuti / totali
    let obtained = 0;
    const exclusiveGroups = new Set();
    const countedGroups = new Set();

    filteredItems.forEach(item => {
      const val = window.save ? resolveSaveValue(window.save, item) : false;
      const isUnlocked =
        (item.type === "level" || item.type === "min" ||
         item.type === "region-level" || item.type === "region-min")
          ? (val ?? 0) >= (item.required ?? 0)
          : item.type === "collectable"
            ? (val ?? 0) > 0
            : (val === true || val === "collected" || val === "deposited");

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
      (filteredItems.filter(i => !i.exclusiveGroup).length || 0) +
      exclusiveGroups.size;

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
      spoilerOn
    });

    if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
}


async function updateWishesContent(selectedAct = "all") {
  const container = document.getElementById("wishes-grid");
  if (!container) return console.warn("[updateWishesContent] Missing #wishes-grid in DOM");

  // 🗃️ Carica il file JSON
  const response = await fetch("data/wishes.json");
  const questData = await response.json();

  const spoilerOn = document.getElementById("spoilerToggle")?.checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;
  container.innerHTML = "";

  questData.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

    // 🏷️ Titolo sezione
    const heading = document.createElement("h3");
    heading.className = "category-title";
    heading.textContent = sectionData.label;

    // 🔒 Gestione quest mutuamente esclusive
    const exclusivePairs = [
      ["Huntress Quest", "Huntress Quest Runt"],
    ];

    // ✅ 1️⃣ Filtra per salvataggio
    let filteredItems = (sectionData.items || []).filter(item => {
      if (!window.save) return true;
      const pair = exclusivePairs.find(p => p.includes(item.flag));
      if (!pair) return true;
      const [a, b] = pair;
      const aVal = resolveSaveValue(window.save, { flag: a, type: "quest" });
      const bVal = resolveSaveValue(window.save, { flag: b, type: "quest" });
      const aActive = aVal === true || aVal === "completed" || aVal === "accepted";
      const bActive = bVal === true || bVal === "completed" || bVal === "accepted";
      if ((aActive && item.flag === b) || (bActive && item.flag === a)) return false;
      return true;
    });

    // ✅ 2️⃣ Filtra per atto selezionato
    filteredItems = filteredItems.filter(item =>
      selectedAct === "all" || Number(item.act) === Number(selectedAct)
    );

    // ✅ 3️⃣ Seleziona solo i mancanti (coerente con l’atto)
    if (showMissingOnly && window.save) {
      filteredItems = filteredItems.filter(item => {
        const val = resolveSaveValue(window.save, item);
        if (item.type === "quest") return val !== "completed" && val !== true;
        if (item.type === "collectable") return (val ?? 0) === 0;
        if (["level", "min", "region-level", "region-min"].includes(item.type))
          return (val ?? 0) < (item.required ?? 0);
        return val !== true;
      });
    }

    // 🔹 Colori atti
    filteredItems.forEach(item => {
      if (item.act === 1) item.actColor = "act-1";
      else if (item.act === 2) item.actColor = "act-2";
      else if (item.act === 3) item.actColor = "act-3";
    });

    // 🔢 Calcolo ottenuti / totali (sulla base del filtro attuale)
    let obtained = 0;
    const exclusiveGroups = new Set();
    const countedGroups = new Set();

    filteredItems.forEach(item => {
      const val = window.save ? resolveSaveValue(window.save, item) : false;
      const isUnlocked =
        item.type === "quest"
          ? (val === "completed" || val === true)
          : (item.type === "level" || item.type === "min" ||
             item.type === "region-level" || item.type === "region-min")
            ? (val ?? 0) >= (item.required ?? 0)
            : item.type === "collectable"
              ? (val ?? 0) > 0
              : (val === true || val === "collected" || val === "deposited");

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
      (filteredItems.filter(i => !i.exclusiveGroup).length || 0) +
      exclusiveGroups.size;

    // 🧮 Intestazione
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

    // 🧱 Griglia interna
    const subgrid = document.createElement("div");
    subgrid.className = "grid";

    const visible = renderGenericGrid({
      containerEl: subgrid,
      data: filteredItems,
      spoilerOn
    });

    // Se non c'è nulla da mostrare → salta
    if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
}









function showGenericModal(data) {
  const overlay = document.getElementById("info-overlay");
  const content = document.getElementById("info-content");

  // ✅ Percorso completo per la mappa (funziona anche su GitHub Pages)
  const mapSrc = data.map
    ? (data.map.startsWith("http") ? data.map : `${BASE_PATH}/${data.map}`)
    : null;

  content.innerHTML = `
    <button id="closeInfoModal" class="modal-close">✕</button>
    <img src="${data.icon}" alt="${data.label}" class="info-image">
    <h2 class="info-title">${data.label}</h2>
    <p class="info-description">${data.description || "No description available."}</p>
    ${data.obtain ? `<p class="info-extra"><strong>Obtained:</strong> ${data.obtain}</p>` : ""}
    ${data.cost ? `<p class="info-extra"><strong>Cost:</strong> ${data.cost}</p>` : ""}
    ${mapSrc ? `
      <div class="info-map-wrapper">
        <a href="${mapSrc}" target="_blank" title="Click to open full map">
          <img src="${mapSrc}" alt="Map location" class="info-map">
        </a>
      </div>
    ` : ""}
    ${data.link ? `
      <div class="info-link-wrapper">
        <a href="${data.link}" target="_blank" class="info-link">More info →</a>
      </div>
    ` : ""}
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
    closeInfo.addEventListener("click", () => infoOverlay.classList.add("hidden"));
    infoOverlay.addEventListener("click", (e) => {
      if (e.target === infoOverlay) infoOverlay.classList.add("hidden");
    });
  }
});



function reRenderActiveTab() {
  const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset.tab;
  const currentAct = document.getElementById("actFilter")?.value || "all";
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  // Salva stati
  localStorage.setItem("currentActFilter", currentAct);
  localStorage.setItem("showMissingOnly", showMissingOnly);

  const updater = {
    bosses: updateBossesContent,
    main: updateMainContent,
    essentials: updateNewTabContent,
    wishes: updateWishesContent,
    completion: updateCompletionContent,
  };

  updater[activeTab]?.(currentAct);
}

document.getElementById("missingToggle").addEventListener("change", reRenderActiveTab);
document.getElementById("actFilter").addEventListener("change", reRenderActiveTab);


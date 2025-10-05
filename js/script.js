console.log("No cost too great. No mind to think. No will to break. No voice to cry suffering.");
import { decodeSilksongSave } from "./SaveDecoder.js";

// ---------- DATA ----------
let bossList = [];

fetch('data/bosses.json')
  .then(res => res.json())
  .then(data => {
    bossList = data;
    renderBossGrid();
  });

function renderBossGrid() {
  const grid = document.getElementById("boss-grid");
  grid.innerHTML = "";

  bossList.forEach(boss => {
    const div = document.createElement("div");
    div.className = "boss";
    div.id = boss.id;
    div.dataset.flag = boss.flag;

    const img = document.createElement("img");
    img.alt = boss.label;
    img.dataset.realIcon = boss.icon;
    img.src = "../assets/icons/locked.png";

    const label = document.createElement("div");
    label.textContent = boss.label;

    div.appendChild(img);
    div.appendChild(label);
    grid.appendChild(div);
  });

  updateIcons();
}

// ---------- SPOILER TOGGLE ----------
document.getElementById("spoilerToggle").addEventListener("change", () => {
  const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset.tab;
  
  const updater = {
    bosses: updateIcons,
    main: updateMainContent,
    essentials: updateNewTabContent,
    // aggiungi qui eventuali altre sezioni:
    // charms: updateCharms,
    // items: updateItems,
  };

  updater[activeTab]?.();
});

function updateIcons() {
  const spoilerOn = document.getElementById("spoilerToggle").checked;
  renderGenericGrid({
    containerId: "boss-grid",
    data: bossList,
    spoilerOn
  });
}

document.getElementById("missingToggle").addEventListener("change", applyMissingFilter);

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




async function updateNewTabContent() {
  const response = await fetch("data/essentials.json");
  const newtabData = await response.json();
  const spoilerOn = document.getElementById("spoilerToggle").checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  const container = document.getElementById("essentials-grid");
  container.innerHTML = "";

  newtabData.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

// Titolo con percentuale e conteggio
const heading = document.createElement("h3");
heading.className = "category-title";
heading.textContent = sectionData.label;

// 🔢 Calcola ottenuti / totali per questa categoria
// Conta correttamente anche gruppi esclusivi
let obtained = 0;
const exclusiveGroups = new Set();
const countedGroups = new Set();

(sectionData.items || []).forEach(item => {
  const val = window.save ? resolveSaveValue(window.save, item) : false;
  const isUnlocked =
    (item.type === "level" || item.type === "min" || item.type === "region-level" || item.type === "region-min")
      ? (val ?? 0) >= (item.required ?? 0)
      : item.type === "collectable"
        ? (val ?? 0) > 0
        : val === true;

  // Se l’oggetto appartiene a un gruppo esclusivo
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

// Totale reale = item normali + gruppi esclusivi (non la somma di tutti)
const total = (sectionData.items?.filter(i => !i.exclusiveGroup).length || 0) + exclusiveGroups.size;

if (window.save && Array.isArray(sectionData.items)) {
  obtained = sectionData.items.filter(item => {
    const val = resolveSaveValue(window.save, item);
    if (item.type === "level" || item.type === "min" || item.type === "region-level" || item.type === "region-min") {
      return (val ?? 0) >= (item.required ?? 0);
    } else if (item.type === "collectable") {
      return (val ?? 0) > 0;
    } else {
      return val === true;
    }
  }).length;
}

// 🔘 Percentuale contrib (quella definita nel JSON)
if (sectionData.contrib && sectionData.contrib > 0) {
  const contrib = document.createElement("span");
  contrib.className = "category-contrib";
  contrib.textContent = ` (${sectionData.contrib}%)`;
  heading.appendChild(contrib);
}

// ➕ Conteggio ottenuti / totali
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
      data: sectionData.items,
      spoilerOn
    });

    if (showMissingOnly && visible === 0) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
}






document.addEventListener("DOMContentLoaded", () => {
  updateIcons();

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

  // Quests
  if (item.type === "quest") {
    const entry = pd.QuestCompletionData?.savedData?.find(e => e.Name === item.flag);
    return entry?.Data?.IsCompleted ?? false;
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
    div.id = `${realContainerId}-${item.id}`;
    div.dataset.flag = item.flag;

    const img = document.createElement("img");
    img.alt = item.label;

    // Valore dal salvataggio
    const value = resolveSaveValue(save, item);

    // Stato “completato”
    let isDone = false;
    if (item.type === "level" || item.type === "region-level" || item.type === "min" || item.type === "region-min") {
      isDone = (value ?? 0) >= (item.required ?? 0);
    } else if (item.type === "collectable") {
      isDone = (value ?? 0) > 0;
    } else {
      // flag / key / ability / sceneBool ...
      isDone = value === true;
    }

    // Se “solo mancanti” ed è completato → non renderizzare proprio la card
    if (showMissingOnly && isDone) return;

    // Immagini / classi
    if (isDone) {
      img.src = item.icon || `img/${realContainerId}/${item.id}.png`;
      div.classList.add("done");
    } else if (spoilerOn) {
      img.src = item.icon || `img/${realContainerId}/${item.id}.png`;
      div.classList.add("unlocked");
    } else {
      img.src = "../assets/icons/locked.png";
      div.classList.add("locked");
      const realSrc = item.icon || `img/${realContainerId}/${item.id}.png`;
      div.addEventListener("mouseenter", () => img.src = realSrc);
      div.addEventListener("mouseleave", () => img.src = "../assets/icons/locked.png");
    }

    // Titolo + modal
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = (silkVariants.includes(item.flag) && !unlockedSilkVariant) ? "Silkshot" : item.label;

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

async function handleSaveFile(file) {
  const reader = new FileReader();
  reader.onload = async evt => {
    try {
      const buffer = evt.target.result;

      // 🔍 Riconosce se è un file .dat o un JSON
      const isDat = file.name.toLowerCase().endsWith(".dat");

      let saveData;
      if (isDat) {
        saveData = decodeSilksongSave(buffer);
      } else {
        saveData = JSON.parse(new TextDecoder("utf-8").decode(buffer));
      }

      if (!validateSave(saveData)) {
        showToast("❌ Invalid or corrupted save file");
        return;
      }

      // ✅ Indicizza e salva globalmente
      window.save = indexFlags(saveData);

      // --- Aggiorna statistiche
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

      // --- Aggiorna la tab attiva
      const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset.tab;
      const updater = {
        bosses: updateIcons,
        main: updateMainContent,
        essentials: updateNewTabContent
      };
      updater[activeTab]?.();

      // --- Applica filtri e chiudi overlay
      applyMissingFilter?.();
      showToast("✅ Save file loaded successfully!");
      document.getElementById("uploadOverlay").classList.add("hidden");

    } catch (err) {
      console.error("[save] Decode error:", err);
      showToast("❌ Failed to decode Silksong save file");
    }
  };

  // ✅ Legge sempre come ArrayBuffer (gestisce .dat e JSON)
  reader.readAsArrayBuffer(file);
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
document.querySelectorAll(".sidebar-item").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();

    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("is-active"));
    btn.classList.add("is-active");

    document.querySelectorAll(".tab").forEach(section => {
      section.classList.add("hidden");
    });

    const selectedTab = btn.dataset.tab;
    const activeSection = document.getElementById(`${selectedTab}-section`);
    if (activeSection) {
      activeSection.classList.remove("hidden");
    }

    localStorage.setItem("activeTab", selectedTab);

    // toggle body scroll based on home
    document.body.classList.toggle("home-active", selectedTab === "home");

    // Fix scroll instantly
    if (selectedTab === "home") {
      document.documentElement.style.overflowY = "hidden";
    } else {
      document.documentElement.style.overflowY = "auto";
    }

    // Funzioni per sezione
    const updater = {
      bosses: updateIcons,
      main: updateMainContent,
      essentials: updateNewTabContent,
    };
    updater[selectedTab]?.();
  });
});


// ✅ Aggiunta: set home-active al primo caricamento se siamo su home
window.addEventListener("DOMContentLoaded", () => {
  const savedTab = localStorage.getItem("activeTab") || "home"; // se non c’è nulla → default main

  // resetto tutto
  document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("is-active"));
  document.querySelectorAll(".tab").forEach(section => section.classList.add("hidden"));

  // attivo la scheda salvata
  const btn = document.querySelector(`.sidebar-item[data-tab="${savedTab}"]`);
  if (btn) btn.classList.add("is-active");

  const activeSection = document.getElementById(`${savedTab}-section`);
  if (activeSection) activeSection.classList.remove("hidden");

  // aggiorno il contenuto della scheda
  const updater = {
    bosses: updateIcons,
    main: updateMainContent,
    essentials: updateNewTabContent,
  };
  updater[savedTab]?.();
});



async function updateMainContent() {
  const response = await fetch("data/main.json");
  const mainData = await response.json();
  const spoilerOn = document.getElementById("spoilerToggle").checked;
  const showMissingOnly = document.getElementById("missingToggle")?.checked;

  const container = document.getElementById("main-grid");
  container.innerHTML = "";

  mainData.forEach(sectionData => {
    const section = document.createElement("div");
    section.className = "main-section-block";

// Titolo con percentuale e conteggio
const heading = document.createElement("h3");
heading.className = "category-title";
heading.textContent = sectionData.label;

// 🔢 Calcola ottenuti / totali per questa categoria
// Conta correttamente anche gruppi esclusivi
let obtained = 0;
const exclusiveGroups = new Set();
const countedGroups = new Set();

(sectionData.items || []).forEach(item => {
  const val = window.save ? resolveSaveValue(window.save, item) : false;
  const isUnlocked =
    (item.type === "level" || item.type === "min" || item.type === "region-level" || item.type === "region-min")
      ? (val ?? 0) >= (item.required ?? 0)
      : item.type === "collectable"
        ? (val ?? 0) > 0
        : val === true;

  // Se l’oggetto appartiene a un gruppo esclusivo
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

// Totale reale = item normali + gruppi esclusivi (non la somma di tutti)
const total = (sectionData.items?.filter(i => !i.exclusiveGroup).length || 0) + exclusiveGroups.size;

if (window.save && Array.isArray(sectionData.items)) {
  obtained = sectionData.items.filter(item => {
    const val = resolveSaveValue(window.save, item);
    if (item.type === "level" || item.type === "min" || item.type === "region-level" || item.type === "region-min") {
      return (val ?? 0) >= (item.required ?? 0);
    } else if (item.type === "collectable") {
      return (val ?? 0) > 0;
    } else {
      return val === true;
    }
  }).length;
}

// 🔘 Percentuale contrib (quella definita nel JSON)
if (sectionData.contrib && sectionData.contrib > 0) {
  const contrib = document.createElement("span");
  contrib.className = "category-contrib";
  contrib.textContent = ` (${sectionData.contrib}%)`;
  heading.appendChild(contrib);
}

// ➕ Conteggio ottenuti / totali
const count = document.createElement("span");
count.className = "category-count";
count.textContent = ` ${obtained}/${total}`;
heading.appendChild(count);

section.appendChild(heading);

    // Descrizione
    if (sectionData.desc) {
      const desc = document.createElement("p");
      desc.className = "category-desc";
      desc.textContent = sectionData.desc;
      section.appendChild(desc);
    }

    // Griglia
    const subgrid = document.createElement("div");
    subgrid.className = "grid";
    const visible = renderGenericGrid({
      containerEl: subgrid,
      data: sectionData.items,
      spoilerOn
    });

    // Se “solo mancanti” ed è vuota → non appendere la sezione
    if (showMissingOnly && visible === 0) return;

    section.appendChild(subgrid);
    container.appendChild(section);
  });
}






function showGenericModal(data) {
  const overlay = document.getElementById("info-overlay");
  const content = document.getElementById("info-content");

  content.innerHTML = `
    <button id="closeInfoModal" class="modal-close">✕</button>
    <img src="${data.icon}" alt="${data.label}" class="info-image">
    <h2 class="info-title">${data.label}</h2>
    <p class="info-description">${data.description || "No description available."}</p>
    ${data.obtain ? `<p class="info-extra"><strong>Obtained:</strong> ${data.obtain}</p>` : ""}
    ${data.cost ? `<p class="info-extra"><strong>Cost:</strong> ${data.cost}</p>` : ""}
    ${data.map ? `<img src="${data.map}" alt="Map location" class="info-map">` : ""}
    ${data.link ? `<div class="info-link-wrapper"><a href="${data.link}" target="_blank" class="info-link">More info →</a></div>` : ""}
  `;

  overlay.classList.remove("hidden");

  document.getElementById("closeInfoModal").addEventListener("click", () => {
    overlay.classList.add("hidden");
  });
}





document.addEventListener("DOMContentLoaded", () => {
  const closeInfo = document.getElementById("closeInfoModal");
  const infoOverlay = document.getElementById("info-overlay");

  if (closeInfo && infoOverlay) {
    closeInfo.addEventListener("click", () => infoOverlay.classList.add("hidden"));
    infoOverlay.addEventListener("click", (e) => {
      if (e.target === infoOverlay) infoOverlay.classList.add("hidden");
    });
  }
});

document.getElementById("missingToggle").addEventListener("change", () => {
  const activeTab = document.querySelector(".sidebar-item.is-active")?.dataset.tab;

  const updater = {
    bosses: updateIcons,
    main: updateMainContent,
    essentials: updateNewTabContent,
  };

  // 🔄 forza un re-render della tab attiva
  updater[activeTab]?.();
});


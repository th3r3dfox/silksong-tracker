// js/app.js
import { decodeSave } from './decoder.js';
import { formatBytes, deepFindAny, formatValue } from './utils.js';

/* ---------- Costanti ---------- */
const WIKI_BASE = 'https://hollowknight.fandom.com/wiki/';

/* ---------- Stato ---------- */
let fieldConfig   = { fields: [] };
let groupsCfg     = { groups: [] };
let activeGroupId = null;
let lastSaveObj   = null;

/* ---------- Riferimenti DOM ---------- */
const listEl          = document.getElementById('infoFields');     // opzionale
const fileInput       = document.getElementById('fileInput');
const browseBtn       = document.getElementById('browseBtn');
const savePathDisplay = document.getElementById('savePathDisplay');

const tabsEl        = document.getElementById('tabs');
const sectionsStack = document.getElementById('sectionsStack');

const showJsonBtn  = document.getElementById('showJsonBtn');
const jsonModal    = document.getElementById('jsonModal');
const rawModalOutput = document.getElementById('rawModalOutput');
const copyJsonBtn  = document.getElementById('copyJsonBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const closeJsonBtn = document.getElementById('closeJsonBtn');


/* ───────────────── i18n (MULTILINGUA) ───────────────── */
// lingue supportate + lingua di sistema
const SUPPORTED_LANGS = ['it','en'];
function systemLang() {
  const prefs = (navigator.languages || [navigator.language || 'en']).map(s => s.toLowerCase());
  for (const p of prefs) {
    const base = p.split('-')[0];
    if (SUPPORTED_LANGS.includes(p)) return p;
    if (SUPPORTED_LANGS.includes(base)) return base;
  }
  return 'en';
}
let LANG = (localStorage.getItem('lang') || systemLang()).toLowerCase();

// dizionario UI (puoi ampliare)
const I18N_UI = {
  en: {
    spoilers: 'Spoilers',
    onlyMissing: 'Only incomplete',
    completed: 'COMPLETED',
    noneIncomplete: 'No incomplete items in this section.',
    chooseFile: 'Choose Save File…',
    showJson: 'Show JSON',
    noFile: 'No file',
    chooseSaveNote: 'Choose the correct save file: <code>user*.dat</code> (e.g. <code>user1.dat</code>).'

  },
  it: {
    spoilers: 'Spoiler',
    onlyMissing: 'Solo incompleti',
    completed: 'COMPLETATO',
    noneIncomplete: 'Nessun elemento incompleto in questa sezione.',
    chooseFile: 'Scegli salvataggio…',
    showJson: 'Mostra JSON',
    noFile: 'Nessun file',
    chooseSaveNote: 'Scegli il file di salvataggio corretto: <code>user*.dat</code> (es. <code>user1.dat</code>).'
  },
};

// testi statici nella hero
const I18N_STATIC = {
  gameStatusTitle: { en: 'Game Status', it: 'Stato di gioco', es: 'Estado del juego' },
  timePlayed:      { en: 'Time Played', it: 'Tempo di gioco', es: 'Tiempo jugado' },
  saveVersion:     { en: 'Save Version', it: 'Versione salvataggio', es: 'Versión del guardado' }
};

// testo UI localizzato
function ui(key){
  const d = I18N_UI[LANG] || I18N_UI.en;
  return d[key] || I18N_UI.en[key] || key;
}

// —— Footer i18n ——
const APP_VERSION = ' 0.1.0';
const CREDIT_NAME = 'Fox';
const CREDIT_URL  = 'https://steamcommunity.com/sharedfiles/filedetails/?id=3568819705';
const MEMORIAL_URL = 'https://reznormichael.github.io/hollow-knight-completion-check/'; // <-- metti qui il link reale
const MEMORIAL_NAME = 'ReznoRMichael';
const TEAM_CHERRY_URL = 'https://www.teamcherry.com.au/';                // sito ufficiale
const SILKSONG_URL    = 'https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/'; // pagina Silksong



const I18N_FOOTER = {
  en: {
    title: 'About this project',
    wip: 'Work in Progress',
    wipDesc: 'This project is actively developed. Some sections may change or expand with upcoming updates.',
    creditsTitle: 'Credits',
    creditsPrefix: 'Site made by',
    memTitle: 'In memory',
    // funzione che costruisce l'HTML con il link
    memText: (url, name) =>
      `In memory of <strong>${name}</strong>, creator of the first game’s <a href="${url}" target="_blank" rel="noopener">Analyzer</a>, which accompanied me through my 112% adventures.`,
    legal: (tc, ss) =>
      `Hollow Knight by <a href="${tc}" target="_blank" rel="noopener">Team Cherry</a> © 2017–2025 — learn more about <a href="${ss}" target="_blank" rel="noopener">Hollow Knight: Silksong</a>. This is an unofficial fan project with no affiliation to Team Cherry.`
  },
  it: {
    title: 'Informazioni sul progetto',
    wip: 'Work in Progress',
    wipDesc: 'Questo progetto è in sviluppo attivo. Alcune sezioni potrebbero cambiare o ampliarsi con i prossimi aggiornamenti.',
    creditsTitle: 'Crediti',
    creditsPrefix: 'Sito realizzato da',
    memTitle: 'In memoria',
    memText: (url, name) =>
      `In memoria di <strong>${name}</strong>, creatore dell’<a href="${url}" target="_blank" rel="noopener">Analyzer</a> del primo gioco, che mi ha accompagnato nelle mie avventure fino al 112%.`,
    legal: (tc, ss) =>
      `Hollow Knight di <a href="${tc}" target="_blank" rel="noopener">Team Cherry</a> © 2017–2025 — scopri di più su <a href="${ss}" target="_blank" rel="noopener">Hollow Knight: Silksong</a>. Progetto non ufficiale, senza affiliazione con Team Cherry.`
  }
};


function applyFooterTranslations(){
  const d = I18N_FOOTER[LANG] || I18N_FOOTER.en;

  const setTxt = (id, html, isHTML=false) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isHTML) el.innerHTML = html; else el.textContent = html;
  };

  // Titoli e descrizioni
  setTxt('ftTitle', d.title);
  // usa la pill “Alpha • v0.1.0” se hai definito versionPillText(), altrimenti fallback
  setTxt('ftPill', typeof versionPillText === 'function' ? versionPillText() : `${d.wip} • v${APP_VERSION}`);
  setTxt('ftWipDesc', d.wipDesc);
  setTxt('ftCreditsTitle', d.creditsTitle);
  setTxt('ftCreditsPrefix', d.creditsPrefix);
  setTxt('ftMemTitle', d.memTitle);

  // Testo commemorativo (funzione o stringa) con link
  const memHtml = typeof d.memText === 'function'
    ? d.memText(MEMORIAL_URL, MEMORIAL_NAME)
    : d.memText;
  setTxt('ftMemText', memHtml, true);

  // Riga legale: supporta funzione (con link) o stringa semplice
  const legalHtml = typeof d.legal === 'function'
    ? d.legal(TEAM_CHERRY_URL, SILKSONG_URL)
    : d.legal;
  setTxt('ftLegal', legalHtml, true);

  // Crediti autore/link
  const link = document.getElementById('creditLink');
  const name = document.getElementById('creditName');
  if (link) link.href = CREDIT_URL;
  if (name) name.textContent = CREDIT_NAME;
}




// traduce titoli/etichette/desc dal JSON:
// stringa -> così com’è; oggetto {it,en,...} -> lingua, fallback en/primo valore
function tr(value){
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[LANG] ?? value.en ?? Object.values(value)[0] ?? '';
  }
  return value ?? '';
}

// applica traduzioni ai testi statici della hero e ai bottoni
function applyHeroTranslations(){
  // Titolo "GAME STATUS": prova vari selettori comuni (adatta se servi)
  const heroTitle =
    document.querySelector('#gameStatusTitle') ||
    document.querySelector('.hero-title') ||
    document.querySelector('h2.game-status-title') ||
    document.querySelector('#gameStatus .section-head h2');
  if (heroTitle) heroTitle.textContent = tr(I18N_STATIC.gameStatusTitle);

  // "Time Played" e "Save Version" vicino ai relativi span di valore
  setHeroLabel('#timePlayedText', I18N_STATIC.timePlayed);
  setHeroLabel('#saveVersionText', I18N_STATIC.saveVersion);

  // Bottoni
  if (browseBtn)    browseBtn.textContent = ui('chooseFile');
  if (showJsonBtn)  showJsonBtn.textContent = ui('showJson');
  const noFileEl = document.getElementById('noFileLabel');
  if (noFileEl) noFileEl.textContent = ui('noFile');

  function setHeroLabel(valueSel, labelObj){
    const el = document.querySelector(valueSel);
    if (!el || !el.parentNode) return;
    // se il nodo prima è un testo, lo sostituisco
    if (el.previousSibling && el.previousSibling.nodeType === Node.TEXT_NODE){
      el.previousSibling.textContent = tr(labelObj) + ': ';
      return;
    }
    // se c'è un elemento .label prima, aggiorno
    if (el.previousElementSibling && el.previousElementSibling.classList?.contains('label')){
      el.previousElementSibling.textContent = tr(labelObj) + ':';
      return;
    }
    // altrimenti aggiungo io una label davanti
    const span = document.createElement('span');
    span.className = 'label';
    span.textContent = tr(labelObj) + ': ';
    el.parentNode.insertBefore(span, el);
  }
}

// Traduce/sovrascrive le etichette dei campi hero senza creare duplicati
function applyHeroFieldLabels(){
  (fieldConfig.fields || []).forEach(field => {
    if (!field.target) return;

    const valueEl = document.getElementById(field.target);
    if (!valueEl) return;

    const labelText = (typeof field.label !== 'undefined') ? tr(field.label) : '';
    if (!labelText) return;

    const container =
      valueEl.closest('.stat, .hero-item, .field, .value-wrap') ||
      valueEl.parentElement;

    if (!container) return;

    // Evita duplicati: se l'abbiamo già toccato in passato, aggiorna e basta
    container.dataset.i18nLabeled = '1';

    // 1) Se esiste un elemento label nel contenitore, aggiorna quello
    let labelEl =
      container.querySelector(':scope > .label') ||
      container.querySelector('.field-label, .stat-label, label');

    if (labelEl) {
      labelEl.textContent = `${labelText}:`;
      return;
    }

    // 2) Se il primo nodo del contenitore è un testo tipo "HEALTH: "
    if (container.firstChild && container.firstChild.nodeType === Node.TEXT_NODE) {
      container.firstChild.textContent = `${labelText}: `;
      return;
    }

    // 3) Se c'è un elemento prima del valore che è chiaramente la label, aggiornalo
    if (valueEl.previousElementSibling &&
        !valueEl.previousElementSibling.contains(valueEl) &&
        valueEl.previousElementSibling !== valueEl) {
      const prev = valueEl.previousElementSibling;
      if (!prev.contains(valueEl) && prev.childElementCount === 0) {
        prev.textContent = `${labelText}:`;
        prev.classList.add('label');
        return;
      }
    }

    // 4) Nessuna label trovata: la creo io UNA VOLTA
    const span = document.createElement('span');
    span.className = 'label';
    span.textContent = `${labelText}: `;
    container.insertBefore(span, valueEl);
  });
}



/* ───────────────── Utils locali ───────────────── */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function getAtPath(obj, path){
  if (!obj || !path) return undefined;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts){
    if (cur && typeof cur === 'object' && p in cur){
      cur = cur[p];
    } else return undefined;
  }
  return cur;
}
function normalize(val){
  if (typeof val === 'string'){
    const v = val.trim().toLowerCase();
    if (v === 'true')  return true;
    if (v === 'false') return false;
    if (v === '1')     return 1;
    if (v === '0')     return 0;
    const n = Number(val);
    if (!Number.isNaN(n)) return n;
  }
  return val;
}
function isDoneFromRule(val, rule){
  val = normalize(val);
  if (rule && typeof rule === 'object'){
    if ('equals' in rule) return normalize(val) == normalize(rule.equals);
    if ('min'    in rule) return Number(val) >= Number(rule.min);
    if (Array.isArray(rule.in)) return rule.in.map(normalize).includes(val);
    if (rule.not === true) return !Boolean(val);
  }
  return Boolean(val);
}
function labelToHtml(item){
  const text = escapeHtml(tr(item.label || ''));
  if (item.url) {
    return `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  if (item.wikiSlug) {
    const slug = encodeURIComponent(String(item.wikiSlug).replace(/ /g, '_'));
    return `<a href="${WIKI_BASE}${slug}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  return text;
}

/* ---------- Indicizzatore flag: crea obj.__flags.Scene.ID = Value ---------- */
function indexFlags(root){
  const flags = {};
  const mark = (sceneRaw, idRaw, value) => {
    if (!sceneRaw || !idRaw) return;
    const scene = String(sceneRaw).trim().replace(/\s+/g,'_');
    const idKey = String(idRaw).trim()
      .replace(/\s+/g,'_')           // spazi -> underscore
      .replace(/[^\w.]/g,'_');       // caratteri strani
    if (!flags[scene]) flags[scene] = {};
    flags[scene][idKey] = Boolean(value);
  };

  function walk(node){
    if (Array.isArray(node)){
      for (const it of node) walk(it);
      return;
    }
    if (node && typeof node === 'object'){
      // pattern tipico: { SceneName, ID, Value }
      const hasScene = ('SceneName' in node) || ('sceneName' in node);
      const hasId    = ('ID' in node)        || ('Id' in node) || ('id' in node);
      const hasVal   = ('Value' in node)     || ('value' in node);

      if (hasScene && hasId && hasVal){
        const scene = node.SceneName ?? node.sceneName;
        const id    = node.ID ?? node.Id ?? node.id;
        const val   = node.Value ?? node.value;
        mark(scene, id, val);
      }
      // continua la ricorsione
      for (const k in node) walk(node[k]);
    }
  }

  walk(root);
  // salva nella root per poter usare "__flags.Scene.ID" nei JSON di config
  root.__flags = flags;
  return root;
}

/* ---------- Risoluzione valore item (keys | query) ---------- */
function resolveItemValue(saveObj, item){
  // 1) query: { name, path }
  if (item && item.query && lastSaveObj){
    const qName = String(item.query.name || '').toLowerCase();
    let hit = null;

    // ricerca generica nel tree per proprietà Name/name/displayName ecc.
    (function walk(node){
      if (hit) return;
      if (Array.isArray(node)){ for (const n of node) walk(n); return; }
      if (node && typeof node === 'object'){
        const n = (node.Name ?? node.name ?? node.displayName ?? node.id ?? '').toString().toLowerCase();
        if (n && n === qName) { hit = node; return; }
        for (const k in node) walk(node[k]);
      }
    })(saveObj);

    if (hit){
      const v = getAtPath(hit, item.query.path);
      if (v !== undefined) return v;
    }
    // se non trovato, prosegue su keys
  }

  // 2) keys: usa deepFindAny (supporta path con punti)
  const keys = item?.keys || [];
  let val = deepFindAny(saveObj, keys);
  if (val !== undefined) return val;

  // 3) fallback speciale per __flags.Scene.ID (nel caso deepFindAny non legga)
  for (const k of keys){
    if (typeof k === 'string' && k.startsWith('__flags.')){
      const parts = k.split('.');
      if (parts.length === 3){
        const scene = parts[1];
        const id    = parts[2];
        const v = saveObj?.__flags?.[scene]?.[id];
        if (v !== undefined) return v;
      }
    }
  }
  return undefined;
}

/* ---------- Carica config ---------- */
fetch('config/fields.json')
  .then(r => r.json())
  .then(cfg => { fieldConfig = cfg || { fields: [] }; renderEmptyFields(); applyHeroFieldLabels(); })
  .catch(()   => { fieldConfig = { fields: [] }; renderEmptyFields(); });

fetch('config/sections.json')
  .then(r => r.json())
  .then(cfg => {
    groupsCfg = cfg || { groups: [] };
    buildTabs();
    if (!activeGroupId && groupsCfg.groups?.length){
      activeGroupId = groupsCfg.groups[0].id;
    }
    updateTabsUI();
    renderGroups();
  })
  .catch(() => { groupsCfg = { groups: [] }; });

/* ---------- Lista info opzionale (se hai #infoFields in pagina) ---------- */
function renderEmptyFields() {
  if (!listEl) return;
  listEl.innerHTML = '';
  (fieldConfig.fields || []).forEach((field, idx) => {
    if (field.target) return; // evito duplicati dei target nella hero
    const li = document.createElement('li');
    li.innerHTML = `<strong>${escapeHtml(tr(field.label))}:</strong> <span id="field-${idx}">—</span>`;
    listEl.appendChild(li);
  });
}
function renderFields(saveObj){
  if (!listEl) return;
  (fieldConfig.fields || []).forEach((field, idx) => {
    if (field.target) return;
    const el = document.getElementById(`field-${idx}`);
    if (!el) return;
    const raw  = deepFindAny(saveObj, field.keys || []);
    const text = (raw === undefined) ? '—' : formatValue(raw, field);
    el.textContent = text;
  });
}

/* ---------- Hero targets (Game Status, ecc.) ---------- */
function renderTargets(saveObj){
  (fieldConfig.fields || []).forEach(field => {
    if (!field.target) return;
    const el = document.getElementById(field.target);
    if (!el) return;
    const raw  = deepFindAny(saveObj, field.keys || []);
    const text = (raw === undefined) ? '—' : formatValue(raw, field);
    el.textContent = text;
  });
}

/* ---------- Tabs gruppi ---------- */
function buildTabs(){
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  (groupsCfg.groups || []).forEach(grp => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (activeGroupId === grp.id ? ' active' : '');
    btn.textContent = tr(grp.label || grp.id); // localizzato
    btn.addEventListener('click', () => {
      activeGroupId = grp.id;
      updateTabsUI();
      renderGroups();
    });
    tabsEl.appendChild(btn);
  });
}
function updateTabsUI(){
  if (!tabsEl) return;
  [...tabsEl.querySelectorAll('.tab')].forEach(btn => btn.classList.remove('active'));
  const idx = (groupsCfg.groups || []).findIndex(g => g.id === activeGroupId);
  if (idx >= 0) tabsEl.children[idx]?.classList.add('active');
}

/* ---------- Render delle sezioni del gruppo attivo ---------- */
function renderGroups(){
  if (!sectionsStack) return;
  sectionsStack.innerHTML = '';
  ensureSpoilerCheckbox();
  updateSpoilerRootClass();

  const grp = (groupsCfg.groups || []).find(g => g.id === activeGroupId);
  if (!grp) return;

  (grp.sections || []).forEach(section => {
    const { block, ul, pillEl } = makeSectionBlock(section);

    // riempi lista items
    let done = 0, total = (section.items || []).length;

    (section.items || []).forEach((item, idx) => {
      let ok = false; // default: nulla spunta senza save

      // Special counters
      if (section.id === 'nail_upgrades') {
        if (lastSaveObj) {
          const lvlRaw = deepFindAny(lastSaveObj, [
            'nailUpgrades','NailUpgrades','nail_upgrade',
            'needleUpgrades','needleLevel','nailLevel',
            'weaponLevel','WeaponLevel','Data.nailUpgrades','PlayerData.nailUpgrades'
          ]);
          const lvl = Math.max(0, Math.min(4, Number(lvlRaw) || 0));
          ok = idx <= lvl;
        }

      } else if (section.id === 'silk_regen') {
  if (lastSaveObj) {
    const lvlRaw = deepFindAny(lastSaveObj, [
      'silkRegenMax','SilkRegenMax','silkRegen','silkLevel',
      'PlayerData.silkRegenMax','Data.silkRegenMax'
    ]);

    // lvl = numero di cuori effettivamente ottenuti (non indice)
    const total = section.items?.length || 0;
    const lvl   = Math.max(0, Math.min(total, Number(lvlRaw) || 0));

    // mostra preso solo se l'indice è minore del conteggio
    ok = idx < lvl;   // <-- prima era idx <= lvl (causava il #1 “gratis”)
  }

      } else if (section.id === 'tool_pouch_upgrades') {
        if (lastSaveObj) {
          const lvlRaw = deepFindAny(lastSaveObj, [
            'ToolPouchUpgrades','PlayerData.ToolPouchUpgrades','Data.ToolPouchUpgrades'
          ]);
          const upper  = Math.max(0, (section.items?.length || 1) - 1);
          const lvl    = Math.max(0, Math.min(upper, Number(lvlRaw) || 0));
          ok = idx <= lvl;
        }

      } else if (section.id === 'crafting_kit_upgrades') {
        if (lastSaveObj) {
          const lvlRaw = deepFindAny(lastSaveObj, [
            'ToolKitUpgrades','PlayerData.ToolKitUpgrades','Data.ToolKitUpgrades'
          ]);
          const upper  = Math.max(0, (section.items?.length || 1) - 1);
          const lvl    = Math.max(0, Math.min(upper, Number(lvlRaw) || 0));
          ok = idx <= lvl;
        }

      } else {
        const rawVal = lastSaveObj ? resolveItemValue(lastSaveObj, item) : undefined;
        ok = isDoneFromRule(rawVal, item);
      }

      if (ok) done++;

      const li = document.createElement('li');
      li.className = ok ? 'done' : '';
      li.innerHTML = `${labelToHtml({ ...item, label: tr(item.label || item.name || item.title || item) })}`;
      appendInlineMeta(li, item, ok);
      ul.appendChild(li);
    });

    const pct = total ? Math.round((done / total) * 100) : 0;

    // Mostra contributo fisso se presente
    const displayPct = (section.contrib != null) ? section.contrib : pct;
    pillEl.textContent = `${displayPct}%`;

    // Colora di verde la pill se la sezione è completa al 100%
    if (pct === 100) pillEl.classList.add('complete');
    else pillEl.classList.remove('complete');

    sectionsStack.appendChild(block);
  });

  applyVisibilityFilters();
}




/* Crea DOM per una sezione (titolo + pill + descrizione + lista) */
function makeSectionBlock(section){
  const block = document.createElement('section');
  block.className = 'section-block';

  // header
  const head = document.createElement('div');
  head.className = 'section-head';

  const title = document.createElement('h3');
  title.className = 'section-title';
  title.textContent = tr(section.label || section.id || 'Section'); // localizzato

  const pill = document.createElement('span');
  pill.className = 'pill';
  // se la sezione ha un contributo definito lo mostriamo subito
  pill.textContent = (section.contrib != null) ? `${section.contrib}%` : '0%';

  head.appendChild(title);
  head.appendChild(pill);
  block.appendChild(head);

  if (section.desc){
    const desc = document.createElement('p');
    desc.className = 'section-desc';
    desc.textContent = tr(section.desc); // localizzato
    block.appendChild(desc);
  }

  const ul = document.createElement('ul');
  ul.className = 'checklist';
  block.appendChild(ul);

  return { block, ul, pillEl: pill };
}


/* ---------- Upload & decode ---------- */
browseBtn?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) processFile(file);
});

function processFile(file) {
  const fileInfo = document.getElementById('fileInfo');
  if (fileInfo) {
    fileInfo.textContent = `📄 ${file.name} • ${formatBytes(file.size)}`;
    fileInfo.style.display = 'inline-block';
  }

  file.arrayBuffer().then(buffer => {
    try {
      const jsonStr = decodeSave(new Uint8Array(buffer));
      let obj = JSON.parse(jsonStr);

      // costruisco l'indice __flags.*.* a partire dalle liste {SceneName, ID, Value}
      obj = indexFlags(obj);
      lastSaveObj = obj;

      // hero + eventuale lista info
      renderTargets(obj);
      renderFields(obj);

      // sezioni/gruppi
      renderGroups();

      // JSON raw
      const rawOut = document.getElementById('rawOutput');
      if (rawOut) rawOut.textContent = JSON.stringify(obj, null, 2);
      if (showJsonBtn) showJsonBtn.disabled = false;
    } catch (err) {
      console.error(err);
      alert('❌ Errore nel decode o nel parsing: ' + (err?.message || err));
    }
  });
}

/* ---------- Copia percorso ---------- */
savePathDisplay?.addEventListener('click', () => {
  const text = (savePathDisplay.textContent || '').trim();
  navigator.clipboard.writeText(text)
    .then(() => {
      savePathDisplay.style.borderColor = '#28a745';
      setTimeout(() => savePathDisplay.style.borderColor = 'rgba(255,255,255,0.25)', 900);
    })
    .catch(console.error);
});

/* ---------- Toggle JSON grezzo ---------- */
// (già gestito sopra nel modal)



// --- Back to top ---
(function initBackToTop() {
  // crea il bottone se non esiste
  let btn = document.getElementById('toTop');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'toTop';
    btn.setAttribute('aria-label', 'Torna in cima');
    btn.title = 'Torna in cima';
    btn.textContent = '▲';
    document.body.appendChild(btn);
  }

  const THRESHOLD = 300; // px di scroll prima che appaia

  function toggleBtn() {
    if (window.scrollY > THRESHOLD) btn.classList.add('show');
    else btn.classList.remove('show');
  }
  window.addEventListener('scroll', toggleBtn, { passive: true });
  window.addEventListener('load', toggleBtn);

  // click & tastiera
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();

/* ---------- Modal JSON ---------- */
(function initJsonModal(){
  function openModal(){ if(!jsonModal) return; jsonModal.classList.add('show'); jsonModal.setAttribute('aria-hidden','false'); }
  function closeModal(){ if(!jsonModal) return; jsonModal.classList.remove('show'); jsonModal.setAttribute('aria-hidden','true'); }
  if (showJsonBtn){
    showJsonBtn.addEventListener('click', () => {
      if (!lastSaveObj){ alert('Carica prima un salvataggio.'); return; }
      if (rawModalOutput) rawModalOutput.textContent = JSON.stringify(lastSaveObj, null, 2);
      openModal();
    });
  }
  closeJsonBtn?.addEventListener('click', closeModal);
  jsonModal?.addEventListener('click', (e) => { if (e.target.classList.contains('modal__backdrop')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  copyJsonBtn?.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(rawModalOutput?.textContent || '');
      copyJsonBtn.textContent = 'Copiato!';
      setTimeout(()=> copyJsonBtn.textContent = 'Copia', 900);
    }catch{}
  });
  downloadJsonBtn?.addEventListener('click', () => {
    const blob = new Blob([rawModalOutput?.textContent || ''], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'save_decifrato.json'; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 500);
  });
})();



/* === Spoiler UI state (single source of truth) === */
let SPOILERS_ON = JSON.parse(localStorage.getItem('spoilersOn') || 'false');
let SHOW_ONLY_MISSING = JSON.parse(localStorage.getItem('onlyMissing') || 'false');

// Inject minimal CSS for inline censorship (matches site look)
(function ensureSpoilerStyles(){
  const id = 'spoiler-inline-css';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
  .spoiler-toolbar{display:flex;gap:.5rem;align-items:center;margin:.25rem 0 .75rem 0}
  .spoiler-cbx{appearance:none;-webkit-appearance:none;width:18px;height:18px;border-radius:3px;border:2px solid rgba(255,255,255,.65);background:transparent;display:inline-block;vertical-align:middle;position:relative;cursor:pointer}
  .spoiler-cbx:checked{background:rgba(255,255,255,.7);border-color:rgba(255,255,255,.95)}
  .spoiler-label{font-weight:600;user-select:none;cursor:pointer}
  .inline-meta{position:relative;display:inline-block;margin-left:.4rem;white-space:nowrap;line-height:1.1}
  .inline-meta.censored{color:transparent}
  .inline-meta.censored::after{content:"";position:absolute;inset:0;border-radius:.25rem;background:rgba(255,255,255,.16);transition:background .12s ease,color .12s ease}

/* DOPO: reveal SOLO quando si passa sopra lo span dei meta */
.spoilers-off #sectionsStack .inline-meta.censored:hover{ color:inherit; }
.spoilers-off #sectionsStack .inline-meta.censored:hover::after{ background:transparent; }
`;
  document.head.appendChild(style);
})();

function ensureSpoilerCheckbox(){
  const stack = document.getElementById('sectionsStack');
  if (!stack) return;

  // evita duplicati
  document.querySelectorAll('.spoiler-toolbar').forEach((el,i)=>{ if(i>0) el.remove(); });
  let bar = document.querySelector('.spoiler-toolbar');
  if (!bar){
    bar = document.createElement('div');
    bar.className = 'spoiler-toolbar';

    // Spoilers
    const cbx = document.createElement('input');
    cbx.id = 'spoilerCbx';
    cbx.type = 'checkbox';
    cbx.className = 'spoiler-cbx';
    cbx.checked = !!SPOILERS_ON;
    const lbl = document.createElement('label');
    lbl.className = 'spoiler-label';
    lbl.htmlFor = 'spoilerCbx';
    lbl.textContent = ui('spoilers');   // localizzato
    bar.appendChild(cbx); bar.appendChild(lbl);

    // Solo incompleti
    const miss = document.createElement('input');
    miss.id = 'missingCbx';
    miss.type = 'checkbox';
    miss.className = 'spoiler-cbx';
    miss.checked = !!SHOW_ONLY_MISSING;
    const missLbl = document.createElement('label');
    missLbl.className = 'spoiler-label';
    missLbl.htmlFor = 'missingCbx';
    missLbl.textContent = ui('onlyMissing'); // localizzato
    bar.appendChild(miss); bar.appendChild(missLbl);

    stack.parentElement?.insertBefore(bar, stack);

    cbx.addEventListener('change', () => {
      SPOILERS_ON = cbx.checked;
      localStorage.setItem('spoilersOn', JSON.stringify(SPOILERS_ON));
      updateSpoilerRootClass();    // <— aggiorna classe root per l’hover
      applyVisibilityFilters();    // <— ricensura/decensura le righe
    });
    miss.addEventListener('change', () => {
      SHOW_ONLY_MISSING = miss.checked;
      localStorage.setItem('onlyMissing', JSON.stringify(SHOW_ONLY_MISSING));
      applyVisibilityFilters();
    });

    // stato iniziale
    updateSpoilerRootClass();      // <— imposta la classe iniziale
  } else {
    const lbl = bar.querySelector('label[for="spoilerCbx"]');
    const missLbl = bar.querySelector('label[for="missingCbx"]');
    if (lbl) lbl.textContent = ui('spoilers');
    if (missLbl) missLbl.textContent = ui('onlyMissing');
    const cbx = document.getElementById('spoilerCbx'); if (cbx) cbx.checked = !!SPOILERS_ON;
    const miss = document.getElementById('missingCbx'); if (miss) miss.checked = !!SHOW_ONLY_MISSING;

    updateSpoilerRootClass();      // <— sincronizza anche qui
  }
}


function updateSpoilerRootClass(){
  const root = document.documentElement;
  root.classList.toggle('spoilers-on',  !!SPOILERS_ON);
  root.classList.toggle('spoilers-off', !SPOILERS_ON);
}


function buildInlineMetaText(item){
  const parts = [];
  if (item.location) parts.push(tr(item.location)); // traduci se oggetto
  if (item.notes)    parts.push(tr(item.notes));
  return parts.length ? ' — ' + parts.join(' — ') : '';
}

function appendInlineMeta(li, item, isDone){
  const txt = buildInlineMetaText(item);
  if (!txt) return;
  let labelEl = li.querySelector('.label') || li.firstElementChild;
  if (!labelEl){
    const raw = li.textContent || '';
    li.textContent = '';
    labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = raw;
    li.appendChild(labelEl);
  }
  let meta = li.querySelector('.inline-meta');
  if (!meta){
    meta = document.createElement('span');
    meta.className = 'inline-meta';
    labelEl.insertAdjacentElement('afterend', meta);
  }
  meta.textContent = txt;
  const hasText = txt.trim().length > 0;
  meta.classList.toggle('censored', hasText && !isDone && !SPOILERS_ON);
}

function applyVisibilityFilters(){
  const uls = document.querySelectorAll('#sectionsStack ul.checklist, #sectionsStack ul.item-list');

  uls.forEach(ul => {
    let hidden = 0, total = 0, doneCount = 0;

    // pulizia messaggi precedenti
    ul.querySelectorAll(':scope > li.section-complete-banner, :scope > li.empty-msg')
      .forEach(n => n.remove());

    // ciclo elementi
    ul.querySelectorAll(':scope > li').forEach(li => {
      if (li.classList.contains('section-complete-banner')) return; // safety
      total++;
      const isDone = li.classList.contains('done');
      if (isDone) doneCount++;

      // SPOILER
      const meta = li.querySelector('.inline-meta');
      if (meta){
        const hasText = (meta.textContent || '').trim().length > 0;
        meta.classList.toggle('censored', hasText && !isDone && !SPOILERS_ON);
      }

      // SOLO INCOMPLETI
      const hide = SHOW_ONLY_MISSING && isDone;
      li.style.display = hide ? 'none' : '';
      if (hide) hidden++;
    });

const allDone = total > 0 && doneCount === total;
const block = ul.closest('.section-block');
if (SHOW_ONLY_MISSING && (allDone || total === 0)) {
  if (block) block.style.display = 'none';
} else {
  if (block) block.style.display = '';
}

  // NIENTE banner "COMPLETED" qui

  // Se col filtro scompaiono tutti gli item ma la sezione NON è al 100%,
  // mostriamo un messaggio "nessun elemento incompleto".
  if (SHOW_ONLY_MISSING && total > 0 && hidden === total && !allDone){
    const msg = document.createElement('li');
    msg.className = 'empty-msg';
    msg.style.opacity = '.8';
    msg.style.fontStyle = 'italic';
    msg.textContent = ui('noneIncomplete') || 'No incomplete items in this section.';
    ul.appendChild(msg);
  }
  });
}

/* ---------- Language selector (alto a destra) ---------- */
const FLAG = { it:'🇮🇹', en:'🇬🇧', es:'🇪🇸' };

function ensureLangSelector(){
  let dock = document.getElementById('langDock');
  if (!dock){
    dock = document.createElement('div');
    dock.id = 'langDock';
    dock.innerHTML = `<select id="langSelect" aria-label="Language"></select>`;
    document.body.appendChild(dock);

    const sel = dock.querySelector('#langSelect');
    sel.innerHTML = '';
    SUPPORTED_LANGS.forEach(code=>{
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${FLAG[code] || ''} ${code.toUpperCase()}`;
      sel.appendChild(opt);
    });
    sel.value = LANG;

sel.addEventListener('change', ()=>{
  LANG = sel.value.toLowerCase();
  localStorage.setItem('lang', LANG);

  applyHeroTranslations();
  applyHeroFieldLabels();
  applyFooterTranslations();   // <—
  ensureSpoilerCheckbox();

  buildTabs();
  updateTabsUI();
  renderGroups();
  applyChooseSaveNote();
});

    // CSS minimale per il dock (compatto, leggibile)
    if (!document.getElementById('langDockStyle')) {
      const st = document.createElement('style');
      st.id = 'langDockStyle';
      st.textContent = `
        #langDock{position:fixed;top:12px;right:12px;z-index:10000;}
        #langDock select{
          appearance:none;-webkit-appearance:none;-moz-appearance:none;
          display:inline-block;box-sizing:border-box;
          min-width:88px;min-height:28px;padding:2px 26px 2px 8px;border-radius:8px;
          font-size:.95rem;line-height:normal;color:#fff;
          background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.18);cursor:pointer;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 10 7' fill='none'><path d='M1 1.5L5 5.5L9 1.5' stroke='white' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
          background-repeat:no-repeat;background-position:right 8px center;background-size:9px 6px;
        }
        #langDock option{color:#111 !important;background:#fff !important;}
        @media (max-width:640px){
          #langDock{top:8px;right:8px}
          #langDock select{min-width:78px;min-height:26px;font-size:.9rem;padding:2px 24px 2px 8px}
        }
      `;
      document.head.appendChild(st);
    }
  } else {
    const sel = dock.querySelector('#langSelect');
    if (sel && sel.value !== LANG) sel.value = LANG;
  }
}

function applyChooseSaveNote(){
  const el = document.getElementById('chooseSaveNote');
  if (!el) return;
  el.innerHTML = (I18N_UI[LANG]?.chooseSaveNote || I18N_UI.en.chooseSaveNote);
}


/* ---------- BOOTSTRAP: crea selettore lingua e render ---------- */
(function bootLangSelectorSafely(){
  function boot(){
    ensureLangSelector();      // crea/aggiorna il selettore (no duplicati)
    applyHeroTranslations();   // traduce titolo/etichette hero + bottoni
    applyHeroFieldLabels();
    applyFooterTranslations();
    renderGroups();            // render nella lingua attiva
    applyChooseSaveNote();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    queueMicrotask(boot);
  }
})();

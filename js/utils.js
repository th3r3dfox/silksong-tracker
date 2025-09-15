export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function secondsToHMS(totalSeconds){
  const s = Math.max(0, Math.floor(Number(totalSeconds)||0));
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  return `${h} h ${String(m).padStart(2,'0')} min ${String(sec).padStart(2,'0')} sec`;
}

// Ricerca profonda: supporta . per oggetti e [idx] per array
export function getByPath(obj, path){
  const parts = String(path).split('.');
  let cur = obj;
  for (const part of parts){
    const m = part.match(/^([^\[]+)(?:\[(\d+)\])?$/);
    if (!m) return undefined;
    const key = m[1], idx = m[2];
    if (cur == null || typeof cur !== 'object' || !(key in cur)) return undefined;
    cur = cur[key];
    if (idx !== undefined){
      if (!Array.isArray(cur) || cur.length <= +idx) return undefined;
      cur = cur[+idx];
    }
  }
  return cur;
}

// Cerca la prima chiave/percorsa che esiste
export function deepFindAny(obj, keyOrPaths){
  for (const k of keyOrPaths){
    // prova come percorso puntato
    const v1 = getByPath(obj, k);
    if (v1 !== undefined) return v1;
    // fallback: cerca a profondità arbitraria per chiave esatta
    const found = deepKeySearch(obj, k);
    if (found !== undefined) return found;
  }
  return undefined;
}

function deepKeySearch(obj, key){
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of Object.keys(obj)){
    if (k.toLowerCase() === String(key).toLowerCase()) return obj[k];
    const nested = deepKeySearch(obj[k], key);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

// Formattazione in base al tipo
export function formatValue(raw, field){
  const t = (field.format || 'text').toLowerCase();
  if (t === 'number')  return String(Number(raw));
  if (t === 'boolean') return raw ? 'Sì' : 'No';
  if (t === 'duration'){
    let seconds = Number(raw) || 0;
    if (field.assume_ms_if_large && seconds > 60*60*24*365) seconds = Math.round(seconds/1000);
    return secondsToHMS(seconds);
  }
  if (t === 'percent'){
    const n = Number(raw) || 0;
    // accetta 0..1 o 0..100
    const pct = n <= 1 ? n*100 : n;
    return `${pct.toFixed(0)}%`;
  }
  return String(raw);
}


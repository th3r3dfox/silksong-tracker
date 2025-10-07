import { CSHARP_HEADER, AES_KEY_STRING } from './constants.js';

// ✅ Usa direttamente
const CryptoJS = window.CryptoJS;


/**
 * 🔹 Rimuove l'header e il prefisso di lunghezza dal file .dat
 */
function removeHeader(bytes) {
  const withoutHeader = bytes.subarray(CSHARP_HEADER.length, bytes.length - 1);
  let lengthCount = 0;
  for (let i = 0; i < 5; i++) {
    lengthCount++;
    if ((withoutHeader[i] & 0x80) === 0) break;
  }
  return withoutHeader.subarray(lengthCount);
}

/**
 * 🔓 Decodifica un salvataggio .dat di Hollow Knight: Silksong
 */
export function decodeSilksongSave(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer);

    // Step 1: rimuove l’header Unity/C#
    const noHeader = removeHeader(bytes);

    // Step 2: converte in base64 string (chunked per sicurezza)
    let b64String = "";
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < noHeader.length; i += CHUNK_SIZE) {
      b64String += String.fromCharCode(...noHeader.slice(i, i + CHUNK_SIZE));
    }

    // Step 3: decifra AES ECB PKCS7
    const encryptedWords = CryptoJS.enc.Base64.parse(b64String);
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: encryptedWords });
    const key = CryptoJS.enc.Utf8.parse(AES_KEY_STRING);

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });

    const jsonString = CryptoJS.enc.Utf8.stringify(decrypted);

    if (!jsonString || !jsonString.startsWith("{")) {
      throw new Error("Invalid or encrypted Silksong save (bad header or AES key)");
    }

    const parsed = JSON.parse(jsonString);
    console.groupEnd();
    return parsed;
  } catch (err) {
    console.error("[Decode] Failed to decode Silksong save:", err);
    console.groupEnd();
    throw new Error("Invalid or encrypted Silksong save file");
  }
}

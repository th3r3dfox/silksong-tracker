const CSHARP_HEADER = new Uint8Array([
  0, 1, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0,
]);

/** The AES key used by Silksong to encrypt saves. */
const AES_KEY_STRING = "UKu52ePUBwetZ9wNX88o54dnfKRu0T1l";

/** @type {any} */
const { CryptoJS } = window;

/**
 * 🔹 Removes the header and length prefix from the .dat file
 *
 * @param bytes {Uint8Array}
 */
function removeHeader(bytes) {
  const withoutHeader = bytes.subarray(CSHARP_HEADER.length, bytes.length - 1);
  let lengthCount = 0;
  for (let i = 0; i < 5; i++) {
    lengthCount++;
    const byte = withoutHeader[i];
    if (byte !== undefined && (byte & 0x80) === 0) {
      break;
    }
  }
  return withoutHeader.subarray(lengthCount);
}

/**
 * 🔓 Decodes a Hollow Knight: Silksong .dat save file
 *
 * @param arrayBuffer {ArrayBuffer}
 */
export function decodeSilksongSave(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer);

    // Step 1: remove Unity/C# header
    const noHeader = removeHeader(bytes);

    // Step 2: convert to base64 string (chunked for safety)
    let b64String = "";
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < noHeader.length; i += CHUNK_SIZE) {
      b64String += String.fromCharCode(...noHeader.slice(i, i + CHUNK_SIZE));
    }

    // Step 3: decrypt AES ECB PKCS7
    const encryptedWords = CryptoJS.enc.Base64.parse(b64String);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: encryptedWords,
    });
    const key = CryptoJS.enc.Utf8.parse(AES_KEY_STRING);

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    const jsonString = CryptoJS.enc.Utf8.stringify(decrypted);

    if (!jsonString || !jsonString.startsWith("{")) {
      throw new Error(
        "Invalid or encrypted Silksong save (bad header or AES key)",
      );
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

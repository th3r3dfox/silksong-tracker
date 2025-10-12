// The Web Crypto API does not support AES-ECB, since it is considered insecure. However, that is
// what Unity uses, so we use the "crypto-js" external library to handle the decryption.

import CryptoJS from "crypto-js";

const CSHARP_HEADER = new Uint8Array([
  0, 1, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0,
]);

/** The AES key used by Silksong to encrypt saves. */
const AES_KEY_STRING = "UKu52ePUBwetZ9wNX88o54dnfKRu0T1l";

/** Removes the header and length prefix from the .dat file. */
function removeHeader(bytes: Uint8Array) {
  const withoutHeader = bytes.subarray(CSHARP_HEADER.length, -1);

  let lengthCount = 0;
  for (let i = 0; i < 5; i++) {
    lengthCount++;
    const byte = withoutHeader[i];
    // eslint-disable-next-line no-bitwise
    if (byte !== undefined && (byte & 0x80) === 0) {
      break;
    }
  }

  return withoutHeader.subarray(lengthCount);
}

/** Decodes a Hollow Knight: Silksong .dat save file. */
export function decodeSilksongSave(arrayBuffer: ArrayBuffer): unknown {
  try {
    const bytes = new Uint8Array(arrayBuffer);

    // Step 1: Remove Unity/C# header
    const bytesWithoutHeader = removeHeader(bytes);

    // Step 2: Convert to base64 string (chunked for safety)
    let b64String = "";
    const CHUNK_SIZE = 0x80_00;
    for (let i = 0; i < bytesWithoutHeader.length; i += CHUNK_SIZE) {
      b64String += String.fromCodePoint(
        ...bytesWithoutHeader.slice(i, i + CHUNK_SIZE),
      );
    }

    // Step 3: Decrypt AES ECB PKCS7
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
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("[Decode] Failed to decode Silksong save file:", error);
    throw new Error("Failed to decode the Silksong save file.", {
      cause: error,
    });
  }
}

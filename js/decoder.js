import { CSHARP_HEADER, AES_KEY_STRING } from './constants.js';

export function removeHeader(bytes) {
  const withoutHeader = bytes.subarray(CSHARP_HEADER.length, bytes.length - 1);
  let lengthCount = 0;
  for (let i = 0; i < 5; i++) {
    lengthCount++;
    if ((withoutHeader[i] & 0x80) === 0) break;
  }
  return withoutHeader.subarray(lengthCount);
}

export function decodeSave(fileBytes) {
  const noHeader = removeHeader(fileBytes);
  let b64String = "";
  const CHUNK_SIZE = 65536;
  for (let i = 0; i < noHeader.length; i += CHUNK_SIZE) {
    b64String += String.fromCharCode(...noHeader.slice(i, i + CHUNK_SIZE));
  }
  const encryptedWords = CryptoJS.enc.Base64.parse(b64String);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: encryptedWords });
  const key = CryptoJS.enc.Utf8.parse(AES_KEY_STRING);
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
  return CryptoJS.enc.Utf8.stringify(decrypted);
}

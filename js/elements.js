import { assertIs, assertNotNull } from "./utils.js";

/**
 * Helper function to get an HTML element and throw an error if it does not exist.
 *
 * @param {string} id
 * @returns {HTMLElement}
 */
function getHTMLElement(id) {
  const element = document.getElementById(id);
  assertNotNull(element, `Failed to get HTML element with id: ${id}`);
  return element;
}

/**
 * Helper function to get an HTML input element and throw an error if it does not exist or if it is
 * not an intput element.
 *
 * @param {string} id
 * @returns {HTMLInputElement}
 */
function getHTMLInputElement(id) {
  const element = getHTMLElement(id);
  assertIs(
    element,
    HTMLInputElement,
    `The element with an id of "${id}" is not an input element.`,
  );
  return element;
}

/**
 * Helper function to get an HTML select element and throw an error if it does not exist or if it is
 * not an select element.
 *
 * @param {string} id
 * @returns {HTMLSelectElement}
 */
function getHTMLSelectElement(id) {
  const element = getHTMLElement(id);
  assertIs(
    element,
    HTMLSelectElement,
    `The element with an id of "${id}" is not a select element.`,
  );
  return element;
}

export const actFilter = getHTMLSelectElement("actFilter");
export const allProgressGrid = getHTMLElement("allprogress-grid");
export const backToTop = getHTMLElement("backToTop");
export const closeInfoModal = getHTMLElement("closeInfoModal");
export const closeUploadModal = getHTMLElement("closeUploadModal");
export const copyRawsaveBtn = getHTMLElement("copyRawsaveBtn");
export const downloadRawsaveBtn = getHTMLElement("downloadRawsaveBtn");
export const dropzone = getHTMLElement("dropzone");
export const fileInput = getHTMLInputElement("fileInput");
export const infoOverlay = getHTMLElement("info-overlay");
export const infoContent = getHTMLElement("info-content");
export const missingToggle = getHTMLInputElement("missingToggle");
export const modeBanner = getHTMLElement("modeBanner");
export const nextMatch = getHTMLElement("nextMatch");
export const openUploadModal = getHTMLElement("openUploadModal");
export const prevMatch = getHTMLElement("prevMatch");
export const rawSaveOutput = getHTMLElement("rawsave-output");
export const rawSaveSearch = getHTMLElement("rawsave-search");
export const refreshSaveBtn = getHTMLElement("refreshSaveBtn");
export const searchCounter = getHTMLElement("searchCounter");
export const spoilerToggle = getHTMLInputElement("spoilerToggle");
export const uploadOverlay = getHTMLElement("uploadOverlay");

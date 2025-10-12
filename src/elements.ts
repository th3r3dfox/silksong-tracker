import { assertIs, assertNotNull } from "complete-common";

/** Helper function to get an HTML element and throw an error if it does not exist. */
export function getHTMLElement(id: string): HTMLElement {
  const element = document.querySelector(`#${id}`);
  assertNotNull(element, `Failed to get HTML element with id: ${id}`);
  assertIs(
    element,
    HTMLElement,
    `The element with an id of "${id}" is not an HTML element.`,
  );
  return element;
}

/**
 * Helper function to get an HTML input element and throw an error if it does not exist or if it is
 * not an intput element.
 */
function getHTMLInputElement(id: string): HTMLInputElement {
  const element = getHTMLElement(id);
  assertIs(
    element,
    HTMLInputElement,
    `The element with an id of "${id}" is not an input element.`,
  );
  return element;
}

export function getHTMLElements(
  parentElement: Document | Element,
  selector: string,
): readonly Element[] {
  const nodeListOfElement = parentElement.querySelectorAll(selector);

  // The spread operator does not convert to an array.
  // eslint-disable-next-line unicorn/prefer-spread
  return Array.from(nodeListOfElement);
}

export const allProgressGrid = getHTMLElement("allprogress-grid");
export const backToTop = getHTMLElement("backToTop");
export const closeInfoModal = getHTMLElement("closeInfoModal");
export const closeUploadModal = getHTMLElement("closeUploadModal");
export const completionValue = getHTMLElement("completionValue");
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
export const playtimeValue = getHTMLElement("playtimeValue");
export const prevMatch = getHTMLElement("prevMatch");
export const rawSaveOutput = getHTMLElement("rawsave-output");
export const rawSaveSearch = getHTMLInputElement("rawsave-search");
export const rosariesValue = getHTMLElement("rosariesValue");
export const searchCounter = getHTMLElement("searchCounter");
export const shardsValue = getHTMLElement("shardsValue");
export const sidebarItems = getHTMLElements(document, ".sidebar-item");
export const spoilerToggle = getHTMLInputElement("spoilerToggle");
export const tocList = getHTMLElement("toc-list");
export const uploadOverlay = getHTMLElement("uploadOverlay");

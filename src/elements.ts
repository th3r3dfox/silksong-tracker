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
export function getHTMLInputElement(id: string): HTMLInputElement {
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
export const closeInfoModal = getHTMLElement("closeInfoModal");
export const closeUploadModal = getHTMLElement("closeUploadModal");
export const completionValue = getHTMLElement("completionValue");
export const dropzone = getHTMLElement("dropzone");
export const fileInput = getHTMLInputElement("fileInput");
export const infoOverlay = getHTMLElement("info-overlay");
export const infoContent = getHTMLElement("info-content");
export const modeBanner = getHTMLElement("modeBanner");
export const saveDateContainer = getHTMLElement("saveDateContainer");
export const saveDateValue = getHTMLElement("saveDateValue");
export const playtimeValue = getHTMLElement("playtimeValue");
export const rosariesValue = getHTMLElement("rosariesValue");
export const shardsValue = getHTMLElement("shardsValue");
export const tocList = getHTMLElement("toc-list");
export const uploadOverlay = getHTMLElement("uploadOverlay");
export const mapActSelector = getHTMLElement("map-act-select");
export const worldMap = getHTMLElement("worldMap");
export const logoLink = getHTMLElement("logo-link") as HTMLAnchorElement;
export const clearDataBtn = getHTMLElement("clearDataBtn") as HTMLAnchorElement;

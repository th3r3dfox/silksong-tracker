/**
 * Helper function to get an HTML element and throw an error if it does not exist.
 *
 * @param id {string}
 * @param msg {string}
 * @returns {HTMLElement}
 */
function getHTMLElement(id) {
  const element = document.getElementById(id);

  if (element === null) {
    throw new Error(`Failed to get HTML element with id: ${id}`);
  }

  return element;
}

/**
 * Helper function to get an HTML input element and throw an error if it does not exist or if it is
 * not an intput element.
 *
 * @param id {string}
 * @returns {HTMLInputElement}
 */
function getHTMLInputElement(id) {
  const element = getHTMLElement(id);

  if (!(element instanceof HTMLInputElement)) {
    throw new Error(
      `The HTML element with an id of "${id}" is not an HTML input element.`,
    );
  }

  return element;
}

export const actFilter = getHTMLInputElement("actFilter");
export const backToTop = getHTMLElement("backToTop");
export const closeUploadModal = getHTMLElement("closeUploadModal");
export const dropzone = getHTMLElement("dropzone");
export const fileInput = getHTMLElement("fileInput");
export const missingToggle = getHTMLInputElement("missingToggle");
export const openUploadModal = getHTMLElement("openUploadModal");
export const spoilerToggle = getHTMLInputElement("spoilerToggle");
export const uploadOverlay = getHTMLElement("uploadOverlay");

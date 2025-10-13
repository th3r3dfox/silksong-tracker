import { dropzone, getHTMLElement, uploadOverlay } from "../elements.ts";

const uploadSave = getHTMLElement("upload-save");

export function initUploadSave(): void {
  uploadSave.addEventListener("click", onClick);
}

function onClick() {
  uploadOverlay.classList.remove("hidden");
  dropzone.focus();
}

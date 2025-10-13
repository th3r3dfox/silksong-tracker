import { getHTMLInputElement } from "../elements.ts";
import { renderActiveTab } from "../render-tab.ts";

const LOCAL_STORAGE_KEY = "showOnlyMissing";

export const showOnlyMissing = getHTMLInputElement("show-only-missing");

export function initShowOnlyMissing(): void {
  showOnlyMissing.addEventListener("change", onChangeCheckbox);

  // Restore the previous state of the checkbox from `localStorage`.
  showOnlyMissing.checked = localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
}

function onChangeCheckbox() {
  localStorage.setItem(LOCAL_STORAGE_KEY, showOnlyMissing.checked.toString());
  renderActiveTab();
}

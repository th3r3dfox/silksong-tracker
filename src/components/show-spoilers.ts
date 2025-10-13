import { getHTMLInputElement } from "../elements.ts";
import { renderActiveTab } from "../render-tab.ts";

const LOCAL_STORAGE_KEY = "showSpoilers";

export const showSpoilers = getHTMLInputElement("show-spoilers");

export function initShowSpoilers(): void {
  showSpoilers.addEventListener("change", onChangeCheckbox);

  // Restore the previous state of the checkbox from `localStorage`.
  const savedSpoilerState = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedSpoilerState !== null) {
    showSpoilers.checked = savedSpoilerState === "true";
  }
  const spoilerChecked = showSpoilers.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);
}

function onChangeCheckbox() {
  const spoilerChecked = showSpoilers.checked;
  localStorage.setItem(LOCAL_STORAGE_KEY, spoilerChecked.toString());
  document.body.classList.toggle("spoiler-on", !spoilerChecked);
  renderActiveTab();
}

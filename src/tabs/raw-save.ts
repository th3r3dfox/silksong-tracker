import {
  getHTMLElement,
  getHTMLElements,
  getHTMLInputElement,
} from "../elements.ts";
import { getSaveData } from "../save-data.ts";
import { showToast } from "../utils.ts";

const rawSaveDataSearch = getHTMLInputElement("raw-save-data-search");
const rawSaveDataSearchCounter = getHTMLElement("raw-save-data-search-counter");
const rawSaveDataPreviousMatch = getHTMLElement("raw-save-data-previous-match");
const rawSaveDataNextMatch = getHTMLElement("raw-save-data-next-match");
const rawSaveDataCopy = getHTMLElement("raw-save-data-copy");
const rawSaveDataDownload = getHTMLElement("raw-save-data-download");
const rawSaveDataOutput = getHTMLElement("raw-save-data-output");

let matches: number[] = [];
let currentMatch = 0;

export function initRawSaveData(): void {
  rawSaveDataSearch.addEventListener("input", () => {
    const saveData = getSaveData();
    const jsonText = JSON.stringify(saveData ?? {}, undefined, 2);
    rawSaveDataOutput.innerHTML = jsonText;

    matches = [];
    currentMatch = 0;

    rawSaveDataSearchCounter.textContent = "0/0";

    const query = rawSaveDataSearch.value.trim();
    if (query === "") {
      return;
    }

    const safeQuery = query.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
    const regex = new RegExp(safeQuery, "gi");

    let html = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(jsonText)) !== null) {
      html += jsonText.slice(lastIndex, match.index);
      html += `<mark class="search-match">${match[0]}</mark>`;
      ({ lastIndex } = regex);
      matches.push(match.index);
    }
    html += jsonText.slice(lastIndex);
    rawSaveDataOutput.innerHTML = html;

    if (matches.length > 0) {
      currentMatch = 1;
      scrollToMatch(currentMatch);
    }
    rawSaveDataSearchCounter.textContent = `${currentMatch}/${matches.length}`;
  });

  rawSaveDataNextMatch.addEventListener("click", () => {
    if (matches.length === 0) {
      return;
    }

    currentMatch = (currentMatch % matches.length) + 1;
    scrollToMatch(currentMatch);
  });

  rawSaveDataPreviousMatch.addEventListener("click", () => {
    if (matches.length === 0) {
      return;
    }

    currentMatch = ((currentMatch - 2 + matches.length) % matches.length) + 1;
    scrollToMatch(currentMatch);
  });

  rawSaveDataCopy.addEventListener("click", () => {
    const text = rawSaveDataOutput.textContent;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("📋 JSON copied to clipboard.");
      })
      .catch(() => {
        showToast("❌ Copy failed.");
      });
  });

  rawSaveDataDownload.addEventListener("click", () => {
    const saveData = getSaveData();

    if (saveData === undefined) {
      showToast("❌ No save loaded yet.");
      return;
    }
    const saveDataString = JSON.stringify(saveData, undefined, 2);
    const blob = new Blob([saveDataString], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "silksong-save.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function scrollToMatch(index: number) {
  const allMarks = getHTMLElements(rawSaveDataOutput, "mark.search-match");
  for (const mark of allMarks) {
    mark.classList.remove("active-match");
  }

  const mark = allMarks[index - 1];
  if (mark !== undefined) {
    mark.classList.add("active-match");
    mark.scrollIntoView({
      behavior: "instant",
      block: "center",
    });
  }

  rawSaveDataSearchCounter.textContent = `${index}/${matches.length}`;
}

export function updateTabRawSave(): void {
  const saveData = getSaveData();

  if (saveData === undefined) {
    rawSaveDataOutput.textContent = "No save file loaded.";
    return;
  }

  try {
    rawSaveDataOutput.textContent = JSON.stringify(saveData, undefined, 2);
  } catch (error) {
    rawSaveDataOutput.textContent = `❌ Failed to display raw save: ${error}`;
    console.error(error);
  }
}

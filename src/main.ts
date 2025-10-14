import { initActsDropdown } from "./components/acts-dropdown.ts";
import { initBackToTop } from "./components/back-to-top.ts";
import { initShowOnlyMissing } from "./components/show-only-missing.ts";
import { initShowSpoilers } from "./components/show-spoilers.ts";
import {
  getStoredActiveTab,
  initSidebarItems,
} from "./components/sidebar-items.ts";
import { initUploadSave } from "./components/upload-save.ts";
import {
  closeInfoModal,
  closeUploadModal,
  copyRawsaveBtn,
  downloadRawsaveBtn,
  dropzone,
  fileInput,
  getHTMLElement,
  getHTMLElements,
  infoOverlay,
  nextMatch,
  prevMatch,
  rawSaveOutput,
  rawSaveSearch,
  searchCounter,
  uploadOverlay,
} from "./elements.ts";
import { renderActiveTab } from "./render-tab.ts";
import { getSaveData, handleSaveFile } from "./save-data.ts";
import { showToast } from "./utils.ts";

function main() {
  // We only want to have one `DOMContentLoaded` callback so that all logic runs in a deterministic
  // order.
  document.addEventListener("DOMContentLoaded", () => {
    initComponents();
    renderActiveTab();
  });
}

function initComponents() {
  // Top-nav
  initActsDropdown();
  initShowOnlyMissing();
  initShowSpoilers();
  initUploadSave();

  // Left-nav
  initSidebarItems();

  // Other
  initBackToTop();
}

document.addEventListener("DOMContentLoaded", () => {
  function closeUploadModalFunc() {
    uploadOverlay.classList.add("hidden");
  }

  closeUploadModal.addEventListener("click", closeUploadModalFunc);
  uploadOverlay.addEventListener("click", (e) => {
    if (e.target === uploadOverlay) {
      closeUploadModalFunc();
    }
  });

  dropzone.addEventListener("click", () => {
    fileInput.click();
  });
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  for (const type of ["dragenter", "dragover"]) {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  }
  for (const type of ["dragleave", "drop"]) {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  }
  dropzone.addEventListener("drop", (dragEvent) => {
    const { dataTransfer } = dragEvent;
    if (dataTransfer === null) {
      return;
    }

    const { files } = dataTransfer;
    const firstFile = files[0];

    // We do not have to await this since it is the last operation in the callback.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    handleSaveFile(firstFile);
  });

  const paths: Record<string, string> = {
    windows: String.raw`%USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight Silksong`,
    mac: "~/Library/Application Support/com.teamcherry.hollowsilksong",
    linux: "~/.config/unity3d/Team Cherry/Hollow Knight Silksong",
    steam: String.raw`%USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight Silksong`,
  };

  const pills = getHTMLElements(document, ".pill");
  for (const btn of pills) {
    btn.addEventListener("click", () => {
      const key = btn.textContent.trim().toLowerCase();
      const path = paths[key];

      if (path === undefined) {
        if (key === "steam cloud") {
          window.open(
            "https://store.steampowered.com/account/remotestorageapp/?appid=1030300",
            "_blank",
          );
          return;
        }

        showToast(`❌ No path available for: ${key}`);
        return;
      }

      navigator.clipboard
        .writeText(path)
        .then(() => {
          showToast("📋 Path copied to clipboard!");
        })
        .catch((error: unknown) => {
          console.error("Clipboard error:", error);
          showToast("❌ Unable to copy path.");
        });
    });
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];

  // We do not have to await this since it is the last operation in the callback.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleSaveFile(file);
});

document.addEventListener("DOMContentLoaded", () => {
  // Copy JSON
  copyRawsaveBtn.addEventListener("click", () => {
    const text = rawSaveOutput.textContent;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("📋 JSON copied to clipboard!");
      })
      .catch(() => {
        showToast("❌ Copy failed.");
      });
  });

  // Download JSON
  downloadRawsaveBtn.addEventListener("click", () => {
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

  // Navigable search
  let currentMatch = 0;
  let matches: number[] = [];

  function scrollToMatch(index: number) {
    const allMarks = getHTMLElements(rawSaveOutput, "mark.search-match");
    for (const m of allMarks) {
      m.classList.remove("active-match");
    }
    const lastMark = allMarks[index - 1];
    if (lastMark !== undefined) {
      lastMark.classList.add("active-match");
      lastMark.scrollIntoView({
        behavior: "instant",
        block: "center",
      });
    }
    searchCounter.textContent = `${index}/${matches.length}`;
  }

  rawSaveSearch.addEventListener("input", () => {
    const query = rawSaveSearch.value.trim();
    const saveData = getSaveData();
    const jsonText = JSON.stringify(saveData ?? {}, undefined, 2);
    rawSaveOutput.innerHTML = jsonText;
    matches = [];
    currentMatch = 0;
    searchCounter.textContent = "0/0";
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
    rawSaveOutput.innerHTML = html;

    if (matches.length > 0) {
      currentMatch = 1;
      scrollToMatch(currentMatch);
    }
    searchCounter.textContent = `${currentMatch}/${matches.length}`;
  });

  nextMatch.addEventListener("click", () => {
    if (matches.length === 0) {
      return;
    }
    currentMatch = (currentMatch % matches.length) + 1;
    scrollToMatch(currentMatch);
  });

  prevMatch.addEventListener("click", () => {
    if (matches.length === 0) {
      return;
    }
    currentMatch = ((currentMatch - 2 + matches.length) % matches.length) + 1;
    scrollToMatch(currentMatch);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const tabs = getHTMLElements(document, ".tab");
  for (const section of tabs) {
    section.classList.add("hidden");
  }

  // Activate saved tab.
  const activeTab = getStoredActiveTab();
  const activeSection = getHTMLElement(`${activeTab}-section`);
  activeSection.classList.remove("hidden");

  // Info Modal
  closeInfoModal.addEventListener("click", () => {
    infoOverlay.classList.add("hidden");
  });
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) {
      infoOverlay.classList.add("hidden");
    }
  });
});

main();

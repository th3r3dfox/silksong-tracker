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
  dropzone,
  fileInput,
  getHTMLElement,
  getHTMLElements,
  infoOverlay,
  uploadOverlay,
} from "./elements.ts";
import { renderActiveTab } from "./render-tab.ts";
import { handleSaveFile } from "./save-data.ts";
import { initRawSaveData } from "./tabs/raw-save.ts";
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

  // Tabs
  initRawSaveData();

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

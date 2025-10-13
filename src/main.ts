import {
  assertDefined,
  assertIs,
  assertNotNull,
  includes,
} from "complete-common";
import { initActsDropdown } from "./components/acts-dropdown.ts";
import { initShowOnlyMissing } from "./components/show-only-missing.ts";
import {
  backToTop,
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
  openUploadModal,
  prevMatch,
  rawSaveOutput,
  rawSaveSearch,
  searchCounter,
  sidebarItems,
  spoilerToggle,
  uploadOverlay,
} from "./elements.ts";
import { renderActiveTab, VALID_TABS } from "./render-tab.ts";
import { getSaveData, handleSaveFile } from "./save-data.ts";
import { showToast } from "./utils.ts";

function main() {
  // We only want to have one `DOMContentLoaded` callback so that all logic runs in a deterministic
  // order.
  document.addEventListener("DOMContentLoaded", () => {
    initComponents();
  });
}

function initComponents() {
  initActsDropdown();
  initShowOnlyMissing();
}

spoilerToggle.addEventListener("change", () => {
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);
  localStorage.setItem("showSpoilers", spoilerChecked.toString());
  renderActiveTab();
});

// Back to top button listener.
document.addEventListener("DOMContentLoaded", () => {
  const mainElement = document.querySelector("main");
  assertNotNull(mainElement, "Failed to get the main element.");

  mainElement.addEventListener("scroll", () => {
    const scrollPosition = mainElement.scrollTop;

    backToTop.classList.toggle("show", scrollPosition > 300);
  });

  // Scroll back to top.
  backToTop.addEventListener("click", () => {
    mainElement.scrollTo({
      top: 0,
      behavior: "instant",
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  function openUploadModalFunc() {
    uploadOverlay.classList.remove("hidden");
    dropzone.focus();
  }
  function closeUploadModalFunc() {
    uploadOverlay.classList.add("hidden");
  }

  openUploadModal.addEventListener("click", openUploadModalFunc);
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
          showToast("⚠️ Unable to copy path.");
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
        showToast("⚠️ Copy failed.");
      });
  });

  // Download JSON
  downloadRawsaveBtn.addEventListener("click", () => {
    const saveData = getSaveData();

    if (saveData === undefined) {
      showToast("⚠️ No save loaded yet.");
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

// Handle sidebar clicks
for (const anchor of sidebarItems) {
  assertIs(
    anchor,
    HTMLAnchorElement,
    'An element with a class of "sidebar-item" was not an anchor.',
  );

  anchor.addEventListener("click", (pointerEvent) => {
    pointerEvent.preventDefault();

    // Remove/add activation class
    for (const sidebarItem of sidebarItems) {
      sidebarItem.classList.remove("is-active");
    }
    anchor.classList.add("is-active");

    // Hide all tabs
    const tabs = getHTMLElements(document, ".tab");
    for (const section of tabs) {
      section.classList.add("hidden");
    }

    const selectedTab = anchor.dataset["tab"];
    assertDefined(
      selectedTab,
      "Failed to find the tab corresponding to an anchor element.",
    );
    if (!includes(VALID_TABS, selectedTab)) {
      throw new Error(`The selected tab was not valid: ${selectedTab}`);
    }

    const activeSectionID = `${selectedTab}-section`;
    const activeSection = getHTMLElement(activeSectionID);
    activeSection.classList.remove("hidden");

    localStorage.setItem("activeTab", selectedTab);

    // Enable/disable home scroll
    document.documentElement.style.overflowY = "auto";

    renderActiveTab();
  });
}

const FIRST_VALID_TAB = VALID_TABS[0];
assertDefined(FIRST_VALID_TAB, "Failed to get the first valid tab.");

globalThis.addEventListener("DOMContentLoaded", () => {
  // Restore saved tab and filters.
  let activeTab = FIRST_VALID_TAB;
  const storedActiveTab = localStorage.getItem("activeTab");
  if (storedActiveTab !== null && includes(VALID_TABS, storedActiveTab)) {
    activeTab = storedActiveTab;
  }

  // Restore "Show spoilers" state from localStorage.
  const savedSpoilerState = localStorage.getItem("showSpoilers");
  if (savedSpoilerState !== null) {
    spoilerToggle.checked = savedSpoilerState === "true";
  }
  const spoilerChecked = spoilerToggle.checked;
  document.body.classList.toggle("spoiler-on", !spoilerChecked);

  // Reset tab visibility.
  for (const sidebarItem of sidebarItems) {
    sidebarItem.classList.remove("is-active");
  }
  const tabs = getHTMLElements(document, ".tab");
  for (const section of tabs) {
    section.classList.add("hidden");
  }

  // Activate saved tab.
  const btn = document.querySelector(`.sidebar-item[data-tab="${activeTab}"]`);
  if (btn) {
    btn.classList.add("is-active");
  }

  const activeSection = getHTMLElement(`${activeTab}-section`);
  activeSection.classList.remove("hidden");

  renderActiveTab();
});

document.addEventListener("DOMContentLoaded", () => {
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

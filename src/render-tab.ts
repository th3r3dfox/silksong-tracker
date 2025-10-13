import {
  assertDefined,
  assertIs,
  assertNotNull,
  includes,
} from "complete-common";
import { showOnlyMissing } from "./components/show-only-missing.ts";
import { getHTMLElements } from "./elements.ts";
import { updateTabMap } from "./tabs/map.ts";
import { updateTabProgress } from "./tabs/progress.ts";
import { updateTabRawSave } from "./tabs/raw-save.ts";

const TAB_TO_UPDATE_FUNCTION = {
  allprogress: updateTabProgress,
  rawsave: updateTabRawSave,
  map: updateTabMap,
} as const;
export const TABS = Object.keys(TAB_TO_UPDATE_FUNCTION) as ReadonlyArray<
  keyof typeof TAB_TO_UPDATE_FUNCTION
>;
export type Tab = (typeof TABS)[number];

export function renderActiveTab(): void {
  const activeElement = document.querySelector(".sidebar-item.is-active");
  assertNotNull(activeElement, "Failed to get the active element.");
  assertIs(
    activeElement,
    HTMLAnchorElement,
    "The active element was not an HTML anchor element.",
  );

  const activeTab = activeElement.dataset["tab"];
  assertDefined(
    activeTab,
    "Failed to get the name of the active tab from the active element.",
  );
  if (!includes(TABS, activeTab)) {
    throw new TypeError(`The active tab was not valid: ${activeTab}`);
  }

  const func = TAB_TO_UPDATE_FUNCTION[activeTab];
  func();

  if (activeTab === "allprogress") {
    applyMissingFilter();
  }
}

function applyMissingFilter() {
  const showMissingOnly = showOnlyMissing.checked;

  const mainSectionBlocks = getHTMLElements(document, ".main-section-block");
  for (const section of mainSectionBlocks) {
    assertIs(
      section,
      HTMLDivElement,
      'An element with the "main-section-block" class not was a div element.',
    );

    let hasVisible = false;

    const bosses = getHTMLElements(section, ".boss");
    for (const div of bosses) {
      assertIs(
        div,
        HTMLDivElement,
        'An element with the "boss" class not was a div element.',
      );

      if (showMissingOnly) {
        if (div.classList.contains("done")) {
          div.style.display = "none";
        } else {
          div.style.display = "";
          hasVisible = true;
        }
      } else {
        div.style.display = "";
        hasVisible = true;
      }
    }

    // Hide the entire section if it has no visible elements.
    section.style.display = hasVisible ? "" : "none";
  }
}

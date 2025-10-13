// The "Acts" dropdown at the top of the page.

import {
  assertArray,
  assertDefined,
  includes,
  parseIntSafe,
} from "complete-common";
import { getHTMLElement } from "../elements.ts";
import { renderActiveTab } from "../render-tab.ts";
import type { Act } from "../types/Act.ts";

const DEFAULT_ACT_FILTER = [1, 2, 3] as const;

const actsDropdownButton = getHTMLElement("acts-dropdown-button");
const actsDropdownMenu = getHTMLElement("acts-dropdown-menu");

const checkboxInfos: ReadonlyArray<{ act: Act; checkbox: HTMLInputElement }> =
  (() => {
    const checkboxesList = actsDropdownMenu.querySelectorAll<HTMLInputElement>(
      "input[type='checkbox']",
    );

    return Array.from(checkboxesList, (checkbox) => {
      const { value } = checkbox;

      const act = parseIntSafe(value);
      assertDefined(
        act,
        `Failed to parse an act number from a checkbox: ${value}`,
      );

      if (!includes(DEFAULT_ACT_FILTER, act)) {
        throw new TypeError(`An act checkbox has an invalid value: ${act}`);
      }

      return {
        act,
        checkbox,
      };
    });
  })();

export function initActsDropdown(): void {
  // Toggle the menu when the top nav button is clicked.
  actsDropdownButton.addEventListener("click", () => {
    actsDropdownMenu.classList.toggle("hidden");
  });

  // Close the menu if the user clicks outside.
  document.addEventListener("click", (event) => {
    const { target } = event;
    if (
      target !== null
      && target instanceof Node
      && !actsDropdownButton.contains(target)
      && !actsDropdownMenu.contains(target)
    ) {
      actsDropdownMenu.classList.add("hidden");
    }
  });

  // Update the filter when any checkbox changes.
  for (const checkboxInfo of checkboxInfos) {
    const { checkbox } = checkboxInfo;
    checkbox.addEventListener("change", updateActFilter);
  }

  // When the page is loaded, restore the previous state from `localStorage`.
  globalThis.addEventListener("DOMContentLoaded", () => {
    const actFilter = getStoredActFilter();

    for (const checkboxInfo of checkboxInfos) {
      const { act, checkbox } = checkboxInfo;
      checkbox.checked = actFilter.includes(act);
    }
  });
}

/** Executed when a UI checkbox is changed. */
function updateActFilter() {
  const selectedActs = checkboxInfos
    .filter((checkboxInfo) => checkboxInfo.checkbox.checked)
    .map((checkboxInfo) => checkboxInfo.act);

  // Save selection
  const selectedActsString = JSON.stringify(selectedActs);
  localStorage.setItem("currentActFilter", selectedActsString);

  renderActiveTab();
}

/** If there is not a stored value, this function will return the default value. */
export function getStoredActFilter(): readonly Act[] {
  const localStorageKey = "actFilter";

  const actFilterString = localStorage.getItem(localStorageKey);
  if (actFilterString === null) {
    return DEFAULT_ACT_FILTER;
  }

  try {
    const currentActFilter: unknown = JSON.parse(actFilterString);
    assertArray(
      currentActFilter,
      `The "${localStorageKey}" localStorage value must be an array instead of: ${actFilterString}`,
    );

    const arrayValid = currentActFilter.every((act) =>
      includes(DEFAULT_ACT_FILTER, act),
    );
    if (!arrayValid) {
      throw new TypeError(
        `The "${localStorageKey}" localStorage value must be an array of valid acts instead of: ${actFilterString}`,
      );
    }

    return currentActFilter;
  } catch (error) {
    console.warn(error);
    console.warn(
      `Rewriting the "${localStorageKey}" localStorage value to default.`,
    );
    const defaultActFilterString = JSON.stringify(DEFAULT_ACT_FILTER);
    localStorage.setItem("currentActFilter", defaultActFilterString);

    return DEFAULT_ACT_FILTER;
  }
}

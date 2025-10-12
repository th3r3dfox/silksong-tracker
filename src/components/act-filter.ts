// The "Acts" dropdown at the top of the page.

import { assertArray, assertDefined, parseIntSafe } from "complete-common";
import { getHTMLElement } from "../elements.ts";
import { renderActiveTab } from "../render-tab.ts";
import type { Act } from "../types/Act.ts";

const actDropdownButton = getHTMLElement("act-dropdown-button");
const actDropdownMenu = getHTMLElement("act-dropdown-menu");
const checkboxes = getCheckboxesOf(actDropdownMenu);

function getCheckboxesOf(element: HTMLElement): readonly HTMLInputElement[] {
  const checkboxesList = element.querySelectorAll<HTMLInputElement>(
    "input[type='checkbox']",
  );

  // The spread operator does not convert to an array.
  // eslint-disable-next-line unicorn/prefer-spread
  return Array.from(checkboxesList);
}

export function initActFilter(): void {
  // Toggle the menu when the top nav button is clicked.
  actDropdownButton.addEventListener("click", () => {
    actDropdownMenu.classList.toggle("hidden");
  });

  // Close the menu if the user clicks outside.
  document.addEventListener("click", (event) => {
    const { target } = event;
    if (
      target !== null
      && target instanceof Node
      && !actDropdownButton.contains(target)
      && !actDropdownMenu.contains(target)
    ) {
      actDropdownMenu.classList.add("hidden");
    }
  });

  // Update the filter when any checkbox changes.
  for (const checkbox of checkboxes) {
    checkbox.addEventListener("change", updateActFilter);
  }

  // When the page is loaded, restore the previous state from `localStorage`.
  globalThis.addEventListener("DOMContentLoaded", () => {
    const actFilter = getStoredActFilter();

    for (const checkbox of checkboxes) {
      const act = parseIntSafe(checkbox.value);
      assertDefined(act, "Failed to parse an act number from a checkbox.");
      if (act !== 1 && act !== 2 && act !== 3) {
        throw new TypeError(`An act checkbox has an invalid value: ${act}`);
      }
      checkbox.checked = actFilter.includes(act);
    }
  });
}

/** Executed when a UI checkbox is changed. */
function updateActFilter() {
  const checkedCheckboxes = checkboxes.filter((checkbox) => checkbox.checked);
  const selectedActs = checkedCheckboxes.map((checkbox) => {
    const { value } = checkbox;
    const act = parseIntSafe(checkbox.value);
    assertDefined(act, `Failed to parse the value of a checkbox: ${value}`);
    if (act !== 1 && act !== 2 && act !== 3) {
      throw new TypeError(`Invalid act checkbox value: ${value}`);
    }

    return act;
  });

  // Save selection
  const selectedActsString = JSON.stringify(selectedActs);
  localStorage.setItem("currentActFilter", selectedActsString);

  renderActiveTab();
}

/** If there is not a stored value, this function will return the default value. */
export function getStoredActFilter(): readonly Act[] {
  const localStorageKey = "currentActFilter";
  const defaultActFilter = [1, 2, 3] as const;

  const currentActFilterString = localStorage.getItem(localStorageKey);
  if (currentActFilterString === null) {
    return defaultActFilter;
  }

  try {
    const currentActFilter = JSON.parse(currentActFilterString) as unknown;
    assertArray(
      currentActFilter,
      `The "${localStorageKey}" localStorage value must be an array instead of: ${currentActFilterString}`,
    );

    const arrayValid = currentActFilter.every(
      (act) => act === 1 || act === 2 || act === 3,
    );
    if (!arrayValid) {
      throw new TypeError(
        `The "${localStorageKey}" localStorage value must be an array of valid acts instead of: ${currentActFilterString}`,
      );
    }

    return currentActFilter;
  } catch (error) {
    console.warn(error);
    console.warn(
      `Rewriting the "${localStorageKey}" localStorage value to default.`,
    );
    const defaultActFilterString = JSON.stringify(defaultActFilter);
    localStorage.setItem("currentActFilter", defaultActFilterString);

    return defaultActFilter;
  }
}

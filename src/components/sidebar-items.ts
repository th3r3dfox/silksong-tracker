import {
  assertDefined,
  assertIs,
  assertNotNull,
  includes,
} from "complete-common";
import { getHTMLElement, getHTMLElements } from "../elements.ts";
import type { Tab } from "../render-tab.ts";
import { renderActiveTab, TABS } from "../render-tab.ts";

const LOCAL_STORAGE_KEY = "activeTab";

const sidebarItems = (() => {
  const htmlElements = getHTMLElements(document, ".sidebar-item");

  for (const htmlElement of htmlElements) {
    assertIs(
      htmlElement,
      HTMLAnchorElement,
      "One of the sidebar items was not an anchor element.",
    );
  }

  return htmlElements as readonly HTMLAnchorElement[];
})();

export function initSidebarItems(): void {
  for (const anchor of sidebarItems) {
    anchor.addEventListener("click", onClick);
  }

  // Restore the previous active element from `localStorage`.
  const activeTab = getStoredActiveTab();
  for (const sidebarItem of sidebarItems) {
    sidebarItem.classList.remove("is-active");
    if (sidebarItem.dataset["tab"] === activeTab) {
      sidebarItem.classList.add("is-active");
    }
  }
}

function onClick(pointerEvent: PointerEvent) {
  pointerEvent.preventDefault();

  const { target } = pointerEvent;
  assertNotNull(target, "Failed to get the target of a pointer event.");
  assertIs(
    target,
    HTMLAnchorElement,
    "Failed to narrow the target of a pointer event to an HTML anchor element.",
  );

  // Remove/add activation class
  for (const sidebarItem of sidebarItems) {
    sidebarItem.classList.remove("is-active");
  }
  target.classList.add("is-active");

  // Hide all tabs
  const tabs = getHTMLElements(document, ".tab");
  for (const section of tabs) {
    section.classList.add("hidden");
  }

  const selectedTab = target.dataset["tab"];
  assertDefined(
    selectedTab,
    "Failed to find the tab corresponding to an anchor element.",
  );
  if (!includes(TABS, selectedTab)) {
    throw new Error(`The selected tab was not valid: ${selectedTab}`);
  }

  const activeSectionID = `${selectedTab}-section`;
  const activeSection = getHTMLElement(activeSectionID);
  activeSection.classList.remove("hidden");

  localStorage.setItem("activeTab", selectedTab);

  // Enable/disable home scroll
  document.documentElement.style.overflowY = "auto";

  renderActiveTab();
}

export function getStoredActiveTab(): Tab {
  const storedActiveTab = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedActiveTab !== null && includes(TABS, storedActiveTab)) {
    return storedActiveTab;
  }

  const firstTab = TABS[0];
  assertDefined(firstTab, "Failed to get the first tab.");
  return firstTab;
}

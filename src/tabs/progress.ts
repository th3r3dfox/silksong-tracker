import { assertArray } from "complete-common";
import { getStoredActFilter } from "../components/acts-dropdown.ts";
import { showOnlyMissing } from "../components/show-only-missing.ts";
import { showSpoilers } from "../components/show-spoilers.ts";
import { BASE_PATH } from "../constants.ts";
import bossesJSON from "../data/bosses.json" with { type: "json" };
import completionJSON from "../data/completion.json" with { type: "json" };
import essentialsJSON from "../data/essentials.json" with { type: "json" };
import journalJSON from "../data/journal.json" with { type: "json" };
import mainJSON from "../data/main.json" with { type: "json" };
import miniBossesJSON from "../data/mini-bosses.json" with { type: "json" };
import wishesJSON from "../data/wishes.json" with { type: "json" };

import {
  allProgressGrid,
  getHTMLElement,
  getHTMLElements,
  infoContent,
  infoOverlay,
  tocList,
} from "../elements.ts";
import {
  getSaveData,
  getSaveDataFlags,
  getSaveDataMode,
  getSaveDataValue,
} from "../save-data.ts";
import type { Category } from "../types/Category.ts";
import type { Item } from "../types/Item.ts";
import { getIconPath } from "../utils.ts";

type HeartId = "flower-heart" | "coral-heart" | "hunter-heart" | "clover-heart";

const HEART_MEMENTO_IDS = [
  "flower-heart",
  "coral-heart",
  "hunter-heart",
  "clover-heart",
] as const;

// (Broodfest/Runtfeast)
const EXCLUSIVE_QUEST_FLAGS = [
  ["Huntress Quest", "Huntress Quest Runt"],
] as const;

const BASE_DUMMY_ITEM = {
  act: 1,
  icon: "",
  id: "",
  label: "",
  link: "",
} as const;

function isHeartId(id: string): id is HeartId {
  return (HEART_MEMENTO_IDS as readonly string[]).includes(id);
}

function isQuestFlag(
  flag: string,
): flag is "Huntress Quest" | "Huntress Quest Runt" {
  return ["Huntress Quest", "Huntress Quest Runt"].includes(flag);
}

let tocObserver: IntersectionObserver | undefined;
let isManualScroll = false; // prevent observer interference

export function updateTabProgress(): void {
  const spoilerOn = showSpoilers.checked;
  const showMissingOnly = showOnlyMissing.checked;
  allProgressGrid.innerHTML = "";

  const allCategories: Array<{
    title: string;
    categories: Category[];
  }> = [
    { title: "Main Progress", categories: mainJSON.categories as Category[] },
    {
      title: "Essential Items",
      categories: essentialsJSON.categories as Category[],
    },
    { title: "Bosses", categories: bossesJSON.categories as Category[] },
    {
      title: "Mini-Bosses",
      categories: miniBossesJSON.categories as Category[],
    },
    {
      title: "Completion",
      categories: completionJSON.categories as Category[],
    },
    { title: "Wishes", categories: wishesJSON.categories as Category[] },
    { title: "Journal", categories: journalJSON.categories as Category[] },
  ];

  // Render all categories.
  for (const { title, categories } of allCategories) {
    assertArray(
      categories,
      "The contents of one of the JSON files was not an array.",
    );

    const categoryHeader = document.createElement("h2");
    categoryHeader.className = "category-header";
    categoryHeader.textContent = title;
    categoryHeader.style.marginTop = "2rem";
    categoryHeader.style.marginBottom = "1rem";
    allProgressGrid.append(categoryHeader);

    for (const category of categories) {
      const section = document.createElement("div");
      section.className = "main-section-block";

      const heading = document.createElement("h3");
      heading.className = "category-title";
      heading.textContent = category.label;

      const { items } = category;

      const actFilter = getStoredActFilter();
      let filteredItems = items.filter(
        (item) => actFilter.includes(item.act) && matchMode(item),
      );

      const saveData = getSaveData();
      const saveDataFlags = getSaveDataFlags();

      if (showMissingOnly && saveData !== undefined) {
        filteredItems = filteredItems.filter((item) => {
          const value = getSaveDataValue(saveData, saveDataFlags, item);
          if (item.type === "collectable") {
            return (typeof value === "number" ? value : 0) === 0;
          }
          if (item.type === "level") {
            return (typeof value === "number" ? value : 0) < item.required;
          }
          if (item.type === "quest") {
            return value !== "completed" && value !== true;
          }
          return value !== true;
        });
      }

      if (saveData !== undefined) {
        const ownedHeart = filteredItems.find((item) => {
          if (!isHeartId(item.id)) {
            return false;
          }

          if (item.type !== "relic") {
            return false;
          }
          const value = getSaveDataValue(saveData, saveDataFlags, item);
          return (
            value === true
            || value === "collected"
            || value === "deposited"
            || value === "completed"
          );
        });

        if (ownedHeart) {
          filteredItems = filteredItems.filter((item) => {
            if (!isHeartId(item.id)) {
              return true;
            }

            return item.id === ownedHeart.id;
          });
        } else {
          const defaultId = HEART_MEMENTO_IDS[0];
          filteredItems = filteredItems.filter((item) => {
            if (!isHeartId(item.id)) {
              return true;
            }
            return item.id === defaultId;
          });
        }

        // (Broodfest / Runtfeast).
        for (const group of EXCLUSIVE_QUEST_FLAGS) {
          const ownedFlag = group.find((flag) => {
            const value = getSaveDataValue(saveData, saveDataFlags, {
              ...BASE_DUMMY_ITEM,
              type: "quest",
              flag,
            });
            return value === true || value === "completed";
          });

          filteredItems = filteredItems.filter((item) => {
            if (item.type === "sceneVisited") {
              return true;
            }
            if (item.flag === "") {
              return true;
            }
            if (item.type === "materium") {
              return true;
            }
            if (ownedFlag !== undefined) {
              return !(
                isQuestFlag(item.flag)
                && group.includes(item.flag)
                && item.flag !== ownedFlag
              );
            }
            const defaultFlag = group[0];
            if (isQuestFlag(item.flag)) {
              return !group.includes(item.flag) || item.flag === defaultFlag;
            }
            return true;
          });
        }
      }

      let obtained = 0;
      let total = 0;
      const localGroups = new Map<string, boolean>();

      for (const item of filteredItems) {
        if (item.type === "tool" && item.upgradeOf !== undefined) {
          continue;
        }

        const value =
          saveData === undefined
            ? false
            : getSaveDataValue(saveData, saveDataFlags, item);

        const unlocked = getUnlocked(item, value);

        if (item.type === "tool" && item.exclusiveGroup !== undefined) {
          if (!localGroups.has(item.exclusiveGroup)) {
            localGroups.set(item.exclusiveGroup, unlocked);
            total++;
          } else if (unlocked) {
            localGroups.set(item.exclusiveGroup, true);
          }
          continue;
        }

        total++;
        if (unlocked) {
          obtained++;
        }
      }

      for (const unlocked of localGroups.values()) {
        if (unlocked) {
          obtained++;
        }
      }

      const count = document.createElement("span");
      count.className = "category-count";
      count.textContent = ` ${obtained}/${total}`;
      heading.append(count);

      section.append(heading);

      const desc = document.createElement("p");
      desc.className = "category-description";
      desc.textContent = category.description;
      section.append(desc);

      const subgrid = document.createElement("div");
      subgrid.className = "grid";

      const visible = renderGenericGrid(subgrid, filteredItems, spoilerOn);

      if (filteredItems.length === 0 || (showMissingOnly && visible === 0)) {
        continue;
      }

      section.append(subgrid);
      allProgressGrid.append(section);
    }
  }

  buildDynamicTOC();
  initScrollSpy();
}

function getUnlocked(item: Item, value: unknown): boolean {
  if (item.type === "quest") {
    return value === "completed" || value === true;
  }

  if (item.type === "level") {
    const numberValue = typeof value === "number" ? value : 0;
    return numberValue >= item.required;
  }

  if (item.type === "collectable") {
    const numberValue = typeof value === "number" ? value : 0;
    return numberValue > 0;
  }

  if (item.type === "quill" && typeof value === "number") {
    return item.id === `QuillState_${value}` && [1, 2, 3].includes(value);
  }

  if (item.type === "journal") {
    // Fix: count as complete if numeric progress >= required OR if value is boolean true
    const numberValue = typeof value === "number" ? value : 0;
    const { required } = item;
    return numberValue >= required || value === true;
  }

  return value === true || value === "collected" || value === "deposited";
}

function buildDynamicTOC() {
  tocList.innerHTML = "";

  const headers = getHTMLElements(
    document,
    "#allprogress-grid h2, #allprogress-grid h3",
  );

  let currentCategory: HTMLLIElement | undefined;
  let currentSubList: HTMLUListElement | undefined;

  for (const header of headers) {
    const tag = header.tagName.toLowerCase();
    const text = header.textContent.trim();
    if (text === "") {
      continue;
    }

    if (header.id === "") {
      const cleanId = text
        .toLowerCase()
        .replaceAll(/\s+/g, "-")
        .replaceAll(/[^\w-]/g, "");
      header.id = `section-${cleanId}`;
    }

    if (tag === "h2") {
      const li = document.createElement("li");
      li.className = "toc-category";
      li.dataset["manual"] = "false";

      const a = document.createElement("a");
      a.href = `#${header.id}`;
      a.textContent = text;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = getHTMLElement(header.id);
        target.scrollIntoView({
          behavior: "instant",
          block: "start",
        });

        const wasOpen = li.classList.contains("open");
        const tocCategories = getHTMLElements(document, ".toc-category");
        for (const cat of tocCategories) {
          cat.classList.remove("open");
          cat.querySelector(".toc-sublist")?.classList.add("hidden");
        }
        if (!wasOpen) {
          li.classList.add("open");
          li.querySelector(".toc-sublist")?.classList.remove("hidden");
        }
      });

      li.append(a);
      currentSubList = document.createElement("ul");
      currentSubList.className = "toc-sublist hidden";
      li.append(currentSubList);
      tocList.append(li);
      currentCategory = li;
    } else if (
      tag === "h3"
      && currentCategory !== undefined
      && currentSubList !== undefined
    ) {
      const subLi = document.createElement("li");
      subLi.className = "toc-item";
      const a = document.createElement("a");
      a.href = `#${header.id}`;
      a.textContent = text;
      subLi.append(a);
      currentSubList.append(subLi);
    }
  }
}

function showGenericModal(item: Item) {
  let mapSrc: string | undefined;
  if (item.map === undefined || item.map === "") {
    mapSrc = undefined;
  } else if (item.map.startsWith("http")) {
    mapSrc = item.map;
  } else {
    mapSrc = `${BASE_PATH}/${item.map}`;
  }

  const iconPath = getIconPath(item);

  infoContent.innerHTML = `
    <button id="modalCloseBtn" class="modal-close">✕</button>
    <img src="${iconPath}" alt="${item.label}" class="info-image">
    <h2 class="info-title">${item.label}</h2>

    <p class="info-description">${item.description}</p>

    ${
      item.type === "journal"
      && typeof item.hornetDescription === "string"
      && item.hornetDescription.trim() !== ""
        ? `
        <img src="${BASE_PATH}/assets/ui/divider_journal.png" alt="divider" class="journal-divider" />
        <p class="hornet-description">${item.hornetDescription}</p>
      `
        : ""
    }

    ${
      item.type === "level" && item.obtain !== undefined
        ? `<p class="info-extra"><strong>Obtained:</strong> ${item.obtain}</p>`
        : ""
    }
    ${
      item.type === "level" && item.cost !== undefined
        ? `<p class="info-extra"><strong>Cost:</strong> ${item.cost}</p>`
        : ""
    }

    ${
      mapSrc === undefined
        ? ""
        : `
        <div class="info-map-wrapper">
          <div class="map-loading-overlay">
            <span class="map-loading-text">Loading map...</span>
          </div>
          <iframe
            src="${mapSrc}"
            class="info-map-embed"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
            onload="this.previousElementSibling.remove()">
          </iframe>
        </div>
      `
    }

    ${
      item.link === ""
        ? ""
        : `
        <div class="info-link-wrapper">
          <a href="${item.link}" target="_blank" class="info-link">More info</a>
        </div>
      `
    }
  `;

  infoOverlay.classList.remove("hidden");

  // Attach listener to the *newly created* close button.
  const modalCloseBtn = document.querySelector("#modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      infoOverlay.classList.add("hidden");
    });
  }
}

/**
 * Renders a grid of items (e.g. bosses, relics, tools, etc.) with their unlock states.
 *
 * @returns The number of items rendered.
 */
function renderGenericGrid(
  containerElement: HTMLElement,
  items: readonly Item[],
  spoilerOn: boolean,
): number {
  containerElement.innerHTML = "";

  const saveData = getSaveData();
  const saveDataFlags = getSaveDataFlags();

  // Silkshot variants (only one card visible).
  const silkVariants = ["WebShot Architect", "WebShot Forge", "WebShot Weaver"];
  const unlockedSilkVariant = silkVariants.find((silkVariant) => {
    if (saveData === undefined) {
      return false;
    }

    return saveData.playerData.Tools.savedData.some(
      (tool) => tool.Name === silkVariant && tool.Data["IsUnlocked"] === true,
    );
  });

  // ------------------------------------------------------------------
  // APPLY EXCLUSIVE GROUPS (same logic as updateTabProgress)
  // ------------------------------------------------------------------
  if (saveData !== undefined) {
    const ownedHeart = items.find((item) => {
      if (!isHeartId(item.id)) {
        return false;
      }
      if (item.type !== "relic") {
        return false;
      }

      const value = getSaveDataValue(saveData, saveDataFlags, item);
      return (
        value === true
        || value === "collected"
        || value === "deposited"
        || value === "completed"
      );
    });

    if (ownedHeart) {
      items = items.filter(
        (item) => !isHeartId(item.id) || item.id === ownedHeart.id,
      );
    } else {
      const defaultId = HEART_MEMENTO_IDS[0];
      items = items.filter(
        (item) => !isHeartId(item.id) || item.id === defaultId,
      );
    }

    // (Broodfest / Runtfeast)
    const QUEST_EXCLUSIVE_FLAGS = [
      ["Huntress Quest", "Huntress Quest Runt"],
    ] as const;

    for (const group of QUEST_EXCLUSIVE_FLAGS) {
      const ownedFlag = group.find((flag) => {
        const value = getSaveDataValue(saveData, saveDataFlags, {
          ...BASE_DUMMY_ITEM,
          type: "quest",
          flag,
        });
        return value === true || value === "completed";
      });

      if (ownedFlag !== undefined) {
        items = items.filter((item) => {
          if (item.type === "sceneVisited") {
            return true;
          }
          if (item.flag === "") {
            return true;
          }
          if (item.type === "materium") {
            return true;
          }
          return !isQuestFlag(item.flag) || item.flag === ownedFlag;
        });
      }
    }
  }

  // RENDERING

  let renderedCount = 0;

  for (const item of items) {
    const flag = item.type === "sceneVisited" ? undefined : item.flag;

    // Silkshot --> show only 1 variant.
    if (flag !== undefined && silkVariants.includes(flag)) {
      if (unlockedSilkVariant !== undefined && flag !== unlockedSilkVariant) {
        continue;
      }
      if (unlockedSilkVariant === undefined && flag !== "WebShot Architect") {
        continue;
      }
    }

    const div = document.createElement("div");
    div.className = "boss";

    // Act label (ACT I / II / III).
    const romanActs = { 1: "I", 2: "II", 3: "III" };
    const actLabel = document.createElement("span");
    actLabel.className = `act-label act-${item.act}`;
    const romanAct = romanActs[item.act];
    actLabel.textContent = `ACT ${romanAct}`;
    div.append(actLabel);

    div.id = `${containerElement.id}-${item.id}`;
    div.dataset["flag"] = flag;

    const img = document.createElement("img");
    img.alt = item.label;

    // Value from save file (quest can now return "completed" or "accepted").
    const value = getSaveDataValue(saveData, saveDataFlags, item);

    let isDone: boolean;
    let isAccepted = false;

    switch (item.type) {
      case "level": {
        const current = value === undefined ? 0 : Number(value);
        isDone = current >= item.required;
        break;
      }

      case "collectable": {
        const current = value === undefined ? 0 : Number(value);
        isDone = current > 0;
        break;
      }

      case "quill": {
        isDone =
          typeof value === "number"
          && item.id === `QuillState_${value}`
          && [1, 2, 3].includes(value);
        break;
      }

      case "quest": {
        isDone = value === "completed" || value === true;
        isAccepted = value === "accepted";
        break;
      }

      case "relic": {
        isDone = value === "deposited";
        isAccepted = value === "collected";
        break;
      }

      case "materium":
      case "device": {
        isDone = value === "deposited";
        isAccepted = value === "collected";
        break;
      }

      case "journal": {
        const current = typeof value === "number" ? value : 0;
        const { required } = item;
        isDone = current >= required;
        isAccepted = current > 0 && current < required;
        break;
      }

      default: {
        isDone = value === true;
        break;
      }
    }

    // Hide done items if "Only Missing" is checked.
    const showMissingOnly = showOnlyMissing.checked;
    if (showMissingOnly && isDone) {
      continue;
    }

    // Missable / unobtainable / upgrade markers.
    if (item.missable === true) {
      const warn = document.createElement("span");
      warn.className = "missable-icon";
      warn.title = "Missable item - can be permanently lost";
      warn.textContent = "!";
      div.append(warn);
    }

    if (item.unobtainable === true && value !== undefined && !isDone) {
      const unob = document.createElement("span");
      unob.className = "unobtainable-icon";
      unob.title =
        "Unobtainable item - cannot be acquired in current save file";
      unob.textContent = "🔒";
      div.append(unob);
      div.classList.add("unobtainable");
    }

    if (item.type === "tool" && item.upgradeOf !== undefined) {
      const upg = document.createElement("span");
      upg.className = "upgrade-icon";
      upg.title = "Upgraded item";
      upg.textContent = "↑";
      div.append(upg);
    }

    // Image & state
    const iconPath = getIconPath(item);
    const lockedPath = `${BASE_PATH}/assets/icons/locked.png`;

    if (isDone) {
      img.src = iconPath;
      div.classList.add("done");
      const missableIcon = div.querySelector(".missable-icon");
      if (missableIcon !== null) {
        (missableIcon as HTMLElement).style.display = "none";
      }
    } else if (isAccepted) {
      img.src = iconPath;
      div.classList.add("accepted");
    } else if (spoilerOn) {
      img.src = iconPath;
      div.classList.add("unlocked");
    } else {
      img.src = lockedPath;
      div.classList.add("locked");
      div.addEventListener("mouseenter", () => {
        img.src = iconPath;
      });
      div.addEventListener("mouseleave", () => {
        img.src = lockedPath;
      });
    }

    // Title + modal
    const title = document.createElement("div");
    title.className = "title";
    title.textContent =
      flag !== undefined
      && silkVariants.includes(flag)
      && unlockedSilkVariant === undefined
        ? "Silkshot"
        : item.label;

    div.append(img);
    div.append(title);

    // Journal kill counter (n / required).
    if (item.type === "journal") {
      const current = typeof value === "number" ? value : 0;
      const { required } = item;
      const counter = document.createElement("span");
      counter.className = "journal-counter";
      counter.textContent =
        current >= required ? `${current}` : `${current}/${required}`;
      div.append(counter);
    }

    div.addEventListener("click", () => {
      showGenericModal(item);
    });

    containerElement.append(div);
    renderedCount++;
  }

  return renderedCount;
}

function initScrollSpy() {
  const tocLinks = getHTMLElements(document, ".toc-item a, .toc-category > a");

  // Prevent duplicate observers
  if (tocObserver !== undefined) {
    tocObserver.disconnect();
  }

  const updateTocState = (targetId: string) => {
    const match = document.querySelector(`a[href="#${targetId}"]`);
    if (!match) {
      return;
    }

    const parentCategory = match.closest(".toc-category");

    // Update active link
    for (const link of tocLinks) {
      link.classList.remove("active");
    }
    match.classList.add("active");

    // Update category visibility
    const tocCategories = getHTMLElements(document, ".toc-category");
    for (const category of tocCategories) {
      const sublist = category.querySelector(".toc-sublist");
      if (category === parentCategory) {
        category.classList.add("open");
        sublist?.classList.remove("hidden");
      } else {
        category.classList.remove("open");
        sublist?.classList.add("hidden");
      }
    }
  };

  // Create IntersectionObserver for automatic scroll highlighting.
  tocObserver = new IntersectionObserver(
    (entries: readonly IntersectionObserverEntry[]) => {
      if (isManualScroll) {
        return;
      } // Skip updates during manual scroll

      for (const entry of entries) {
        if (entry.isIntersecting) {
          updateTocState(entry.target.id);
          break;
        }
      }
    },
    {
      threshold: 0.6, // At least 60% visible is required
      rootMargin: "-10% 0px -40% 0px", // Delays the change slightly
    },
  );

  const handleTocClick = (event: Event) => {
    event.preventDefault();

    const href = (event.currentTarget as HTMLAnchorElement).getAttribute(
      "href",
    );
    if (href === null || !href.startsWith("#")) {
      return;
    }

    const targetId = href.replace("#", "");
    const targetElement = document.querySelector<HTMLElement>(`#${targetId}`); // adding # to get by id
    if (!targetElement) {
      return;
    }

    // Prevent observer from overriding click highlight.
    isManualScroll = true;
    updateTocState(targetId);

    targetElement.scrollIntoView({ behavior: "instant" });

    // Re-enable observer slightly after scroll completes.
    setTimeout(() => {
      isManualScroll = false;
    }, 800); // adjust if your scroll is slower/faster
  };

  // Attach click listeners
  for (const link of tocLinks) {
    link.removeEventListener("click", handleTocClick); // Prevent duplicate
    link.addEventListener("click", handleTocClick);
  }

  // Observe all headers
  const headers = getHTMLElements(
    document,
    "#allprogress-grid h2, #allprogress-grid h3",
  );
  for (const section of headers) {
    tocObserver.observe(section);
  }
}

function matchMode(item: Item) {
  const { mode } = item;

  // No mode -> always visible.
  if (mode === undefined) {
    return true;
  }

  // BEFORE loading a save -> show all.
  const saveData = getSaveData();
  if (saveData === undefined) {
    return true;
  }

  // AFTER loading -> match mode.
  const saveDataMode = getSaveDataMode();
  return mode === saveDataMode;
}

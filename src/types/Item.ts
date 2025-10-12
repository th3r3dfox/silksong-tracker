import type { Act } from "./Act.ts";
import type { Mode } from "./Mode.ts";

interface ItemBase {
  readonly act: Act;
  readonly icon: string;
  readonly id: string;
  readonly label: string;
  readonly link: string;

  readonly map?: string;
  readonly missable?: boolean;
  readonly mode?: Mode;
  readonly description?: string;
  readonly category?: string;
}

/** Item tracked by a simple flag. */
export interface ItemFlag extends ItemBase {
  readonly type: "flag";
  readonly flag: string;
}

/** Item tracked by an integer. */
export interface ItemFlagInt extends ItemBase {
  readonly type: "flagInt";
  readonly flag: string;
}

/** Item with a required level (e.g., needle upgrades). */
export interface ItemLevel extends ItemBase {
  readonly type: "level";
  readonly flag: string;
  readonly required: number;

  readonly cost?: string;
  readonly obtain?: string;
}

export interface ItemSceneBool extends ItemBase {
  readonly type: "sceneBool";
  readonly flag: string;
  readonly scene: string;
}

export interface ItemSceneVisited extends ItemBase {
  readonly type: "sceneVisited";
  readonly scene: string;
}

/** Tools and equipment. */
export interface ItemTool extends ItemBase {
  readonly type: "tool";
  readonly flag: string;

  readonly exclusiveGroup?: string;
  readonly upgradeOf?: string;
}

/** We deliberately use the Australian spelling to align with Team Cherry. */
export interface ItemCollectable extends ItemBase {
  readonly type: "collectable";
  readonly flag: string;
}

export interface ItemQuest extends ItemBase {
  readonly type: "quest";
  readonly flag: string;
}

export interface ItemKey extends ItemBase {
  readonly type: "key";
  readonly flag: string;
}

export interface ItemJournal extends ItemBase {
  readonly type: "journal";
  readonly flag: string;
  readonly required: number;
}

export interface ItemRelic extends ItemBase {
  readonly type: "relic";
  readonly flag: string;
  readonly scene?: string;
}

export interface ItemMaterium extends ItemBase {
  readonly type: "materium";
  readonly flag: string;
}

export interface ItemDevice extends ItemBase {
  readonly type: "device";
  readonly scene: string;
  readonly flag: string;
  readonly relatedFlag: string;
}

export interface ItemBoss extends ItemBase {
  readonly type: "boss";
  readonly flag: string;
}

export type Item =
  | ItemFlag
  | ItemFlagInt
  | ItemLevel
  | ItemSceneBool
  | ItemSceneVisited
  | ItemTool
  | ItemCollectable
  | ItemQuest
  | ItemKey
  | ItemJournal
  | ItemRelic
  | ItemMaterium
  | ItemDevice
  | ItemBoss;

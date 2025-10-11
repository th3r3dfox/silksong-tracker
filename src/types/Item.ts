import type { Act } from "./Act.ts";
import type { Mode } from "./Mode.ts";

/** Base properties shared by all items. */
interface BaseItem {
  readonly id?: string;
  readonly label?: string;
  readonly icon?: string;
  readonly act?: Act;
  readonly map?: string;
  readonly missable?: boolean;
  readonly mode?: Mode;
  readonly description?: string;
  readonly link?: string;
  readonly cost?: string;
  readonly obtain?: string;
  readonly category?: string;
  readonly exclusiveGroup?: string;
  readonly upgradeOf?: string;
}

/** Item tracked by a simple flag. */
export interface FlagItem extends BaseItem {
  readonly type: "flag";
  readonly flag: string;
}

/** Item tracked by an integer. */
export interface FlagIntItem extends BaseItem {
  readonly type: "flagInt";
  readonly flag: string;
}

/** Item with a required level (e.g., needle upgrades). */
export interface LevelItem extends BaseItem {
  readonly type: "level";
  readonly flag: string;
  readonly required: number;
}

/** Item tracked by scene + flag boolean. */
export interface SceneBoolItem extends BaseItem {
  readonly type: "sceneBool";
  readonly flag: string;
  readonly scene: string;
}

/** Item tracked by scene visits. */
export interface SceneVisitedItem extends BaseItem {
  readonly type: "sceneVisited";
  readonly scene: string;
}

/** Tools and equipment. */
export interface ToolItem extends BaseItem {
  readonly type: "tool";
  readonly flag: string;
}

export interface CollectableItem extends BaseItem {
  readonly type: "collectable";
  readonly flag: string;
}

/** Quest items */
export interface QuestItem extends BaseItem {
  readonly type: "quest";
  readonly flag: string;
}

/** Keys */
export interface KeyItem extends BaseItem {
  readonly type: "key";
  readonly flag: string;
}

export interface JournalItem extends BaseItem {
  readonly type: "journal";
  readonly flag: string;
  readonly required: number;
}

export interface RelicItem extends BaseItem {
  readonly type: "relic";
  readonly flag: string;
  readonly scene?: string;
}

export interface MateriumItem extends BaseItem {
  readonly type: "materium";
  readonly flag: string;
}

export interface DeviceItem extends BaseItem {
  readonly type: "device";
  readonly scene: string;
  readonly flag: string;
  readonly relatedFlag: string;
}

export interface BossItem extends BaseItem {
  readonly type: "boss";
  readonly flag: string;
}

export type Item =
  | FlagItem
  | FlagIntItem
  | LevelItem
  | SceneBoolItem
  | SceneVisitedItem
  | ToolItem
  | CollectableItem
  | QuestItem
  | KeyItem
  | JournalItem
  | RelicItem
  | MateriumItem
  | DeviceItem
  | BossItem;

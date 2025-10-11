import type { Mode } from "./Mode.ts";

/** Base properties shared by all items */
interface BaseItem {
  id?: string;
  icon?: string;
  act?: number;
  map?: string;
  missable?: boolean;
  mode?: Mode;
}

/** Item tracked by a simple flag */
export interface FlagItem extends BaseItem {
  type: "flag";
  flag: string;
}

/** Item with a required level (e.g., needle upgrades) */
export interface LevelItem extends BaseItem {
  type: "level";
  flag: string;
  required: number;
}

/** Item tracked by scene + flag boolean */
export interface SceneBoolItem extends BaseItem {
  type: "sceneBool";
  scene: string;
  flag: string;
}

/** Item tracked by scene visits */
export interface SceneVisitedItem extends BaseItem {
  type: "sceneVisited";
  scene: string;
}

/** Tools and equipment */
export interface ToolItem extends BaseItem {
  type: "tool";
  flag: string;
  upgradeOf?: string;
  exclusiveGroup?: string;
}

/** Collectables */
export interface CollectableItem extends BaseItem {
  type: "collectable";
  flag: string;
}

/** Quest items */
export interface QuestItem extends BaseItem {
  type: "quest";
  flag: string;
}

/** Keys */
export interface KeyItem extends BaseItem {
  type: "key";
  flag: string;
  scene?: string;
}

/** Items with integer flag values */
export interface FlagIntItem extends BaseItem {
  type: "flagInt";
  flag: string;
}

/** Journal entries with kills tracking */
export interface JournalItem extends BaseItem {
  type: "journal";
  flag: string;
  subtype: "kills";
  required: number;
}

/** Relics for trading */
export interface RelicItem extends BaseItem {
  type: "relic";
  flag?: string;
  scene?: string;
}

/** Materials */
export interface MateriumItem extends BaseItem {
  type: "materium";
  flag: string;
}

/** Special devices */
export interface DeviceItem extends BaseItem {
  type: "device";
  scene: string;
  flag: string;
  relatedFlag: string;
}

/** Discriminated union of all item types */
export type Item =
  | FlagItem
  | LevelItem
  | SceneBoolItem
  | SceneVisitedItem
  | ToolItem
  | CollectableItem
  | QuestItem
  | KeyItem
  | FlagIntItem
  | JournalItem
  | RelicItem
  | MateriumItem
  | DeviceItem;

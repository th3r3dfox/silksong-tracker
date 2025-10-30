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
  readonly unobtainable?: boolean;
  readonly group?: string;
  readonly mode?: Mode;
  readonly description?: string;
  readonly category?: string;
}

/** Item tracked by a simple flag. */
interface ItemFlag extends ItemBase {
  readonly type: "flag";
  readonly flag: string;
}

/** Item tracked by an integer. */
interface ItemFlagInt extends ItemBase {
  readonly type: "flagInt";
  readonly flag: string;
}

/** Item with a required level (e.g., needle upgrades). */
interface ItemLevel extends ItemBase {
  readonly type: "level";
  readonly flag: string;
  readonly required: number;

  readonly obtain?: string;
  readonly cost?: string;
}

interface ItemSceneBool extends ItemBase {
  readonly type: "sceneBool";
  readonly flag: string;
  readonly scene: string;
}

interface ItemSceneVisited extends ItemBase {
  readonly type: "sceneVisited";
  readonly scene: string;
}

/** Tools and equipment. */
interface ItemTool extends ItemBase {
  readonly type: "tool";
  readonly flag: string;

  readonly exclusiveGroup?: string;
  readonly upgradeOf?: string;
}

/** We deliberately use the Australian spelling to align with Team Cherry. */
interface ItemCollectable extends ItemBase {
  readonly type: "collectable";
  readonly flag: string;
  readonly use?: string;
}

interface ItemQuill extends ItemBase {
  readonly type: "quill";
  readonly flag: string;
}

interface ItemQuest extends ItemBase {
  readonly type: "quest";
  readonly flag: string;
}

interface ItemKey extends ItemBase {
  readonly type: "key";
  readonly flag?: string;
  readonly flags?: readonly string[];
}

interface ItemJournal extends ItemBase {
  readonly type: "journal";
  readonly flag: string;
  readonly required: number;
  readonly hornetDescription?: string;
}

interface ItemRelic extends ItemBase {
  readonly type: "relic";
  readonly flag: string;
  readonly scene?: string;
}

interface ItemMaterium extends ItemBase {
  readonly type: "materium";
  readonly flag: string;
}

interface ItemDevice extends ItemBase {
  readonly type: "device";
  readonly scene: string;
  readonly flag: string;
  readonly relatedFlag: string;
}

interface ItemBoss extends ItemBase {
  readonly type: "boss";
  readonly flag: string;
}

interface FlagCheck {
  readonly type: "flag";
  readonly flag: string;
}

interface FlagIntCheck {
  readonly type: "flagInt";
  readonly flag: string;
}

interface SceneBoolCheck {
  readonly type: "sceneBool";
  readonly scene: string;
  readonly flag: string;
}

interface SceneVisitedCheck {
  readonly type: "sceneVisited";
  readonly scene: string;
}

interface LevelCheck {
  readonly type: "level";
  readonly flag: string;
  readonly required: number;
}

type ItemCheck =
  | FlagCheck
  | FlagIntCheck
  | SceneBoolCheck
  | SceneVisitedCheck
  | LevelCheck;

interface ItemAnyOf extends ItemBase {
  readonly type: "anyOf";
  readonly anyOf: readonly ItemCheck[];
}

export type Item =
  | ItemFlag
  | ItemFlagInt
  | ItemLevel
  | ItemSceneBool
  | ItemSceneVisited
  | ItemTool
  | ItemCollectable
  | ItemQuill
  | ItemQuest
  | ItemKey
  | ItemJournal
  | ItemRelic
  | ItemMaterium
  | ItemDevice
  | ItemBoss
  | ItemAnyOf;

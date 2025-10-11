import type { Item } from "./Item.ts";

/**
 * A category is a container that groups related items together. Categories appear at the top level
 * of JSON data files and organize items into logical sections. (e.g. "Bosses", "Main Wishes", etc.)
 */
export interface Category {
  /** Unique identifier for the category */
  id: string;

  /** Display name for the category */
  label: string;

  /** Description of what this category contains */
  desc: string;

  /** Array of items within this category */
  items: Item[];
}

import type { Item } from "./Item.ts";

/**
 * A category is a container that groups related items together. Categories appear at the top level
 * of JSON data files and organize items into logical sections. (e.g. "Bosses", "Main Wishes", etc.)
 */
export interface Category {
  id: string;
  label: string;
  desc: string;
  items: Item[];
}

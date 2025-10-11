import type { Mode } from "./Mode.ts";

/** The various */
export interface Item {
  type?: string;
  flag?: string;
  relatedFlag?: string;
  scene?: string;
  required?: number;
  subtype?: string;
  mode?: Mode;
  map?: string;
  icon?: string;
  id?: string;
}

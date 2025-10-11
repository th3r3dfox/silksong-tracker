import type { Mode } from "./Mode.ts";

export interface Item {
  type?: string;
  flag?: string;
  relatedFlag?: string;
  scene?: string;
  required?: number;
  subtype?: string;
  mode?: Mode;
}

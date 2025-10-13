// @ts-check

import { defineConfig } from "vite";
// eslint-disable-next-line import-x/extensions, @typescript-eslint/no-restricted-imports
import { BASE_PATH } from "./src/constants";

export default defineConfig({
  base: BASE_PATH,
});

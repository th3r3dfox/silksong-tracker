import { defineConfig } from "vite";
import { BASE_PATH } from "./src/constants.ts"; // eslint-disable-line @typescript-eslint/no-restricted-imports

export default defineConfig({
  base: BASE_PATH,
});

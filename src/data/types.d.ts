import type { Category } from "../interfaces/Category";

declare module "*/bosses.json" {
  const value: { categories: Category[] };
  export default value;
}

declare module "*/completion.json" {
  const value: { categories: Category[] };
  export default value;
}

declare module "*/essentials.json" {
  const value: { categories: Category[] };
  export default value;
}

declare module "*/main.json" {
  const value: { categories: Category[] };
  export default value;
}

declare module "*/wishes.json" {
  const value: { categories: Category[] };
  export default value;
}

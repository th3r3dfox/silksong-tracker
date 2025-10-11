# Silksong Tracker - Technical Overview

## 1. Overview

Silksong Tracker is a browser-based web application that analyzes and visualizes save files from _Hollow Knight: Silksong_. It decodes encrypted `.dat` files locally in the browser, extracts progression data, and displays it in an interactive interface. All operations occur locally, ensuring privacy and data safety.

## 2. Architecture

The project is entirely client-side, structured as follows:

```txt
silksong-tracker/
│
├── index.html            # Main UI and layout
│
├── src/
│   ├── main.js           # Core logic and rendering
│   ├── save-decoder.js   # Binary decoding and AES decryption
│   ├── ...
|   |
|   └── data/
|       ├── main.json     # Database of items, upgrades, and skills
|       ├── bosses.json   # Optional boss data
│       └── ...
│
├── public/               # Files copied to the website build output
└── docs/                 # Documentation
```

## 3. Data Flow

### 3.1 File Upload

1. The user uploads a `.dat` save file via the “Upload Save” button or drag-and-drop zone.
2. The file is read using the File API and converted to a `Uint8Array`.
3. The bytes are passed to the decoder, which returns a JavaScript object.

### 3.2 Save Decoding (`SaveDecoder.js`)

The Silksong save file is a C# serialized, AES-encrypted, and zlib-compressed binary. Decoding happens in four main steps:

| Step | Function              | Description                                            |
| ---- | --------------------- | ------------------------------------------------------ |
| 1    | `removeHeader(bytes)` | Removes Unity/C# binary header.                        |
| 2    | Base64 reconstruction | Rebuilds the Base64 string from byte data.             |
| 3    | AES decryption        | Decrypts using a static key defined in `constants.js`. |

**Decoded output example:**

```js
{
  "hasDash": true,
  "Heart Piece": {
    "Dock_08": true,
    "Weave_05b": false
  },
  "Silk Spool": {
    "Bone_11b": true
  },
  "PlayTime": 17482,
  "Completion": 58.25
}
```

### 3.3 Save Parsing

The object is passed to the parser, which validates that it has the correct fields using Zod.

### 3.4 Data Correlation and Rendering

Static data from JSON files in the "data" directory define all trackable items. Each JSON entry includes a flag and logic to determine if it completed or missing.

```json
{
  "id": "nail1",
  "label": "Sharpened Needle",
  "flag": "nailUpgrades",
  "type": "level",
  "required": 1
}
```

The JSON is referenced in the TypeScript code:

```js
const value =
  item.type?.startsWith("region") || item.region
    ? save[item.region]?.[item.flag]
    : save[item.flag];
```

Each item is rendered in the grid with its current state (obtained / missing).

## 4. Data Model - `main.json`

### 4.1 Category Object

Each top-level category defines a group of related items.

```json
{
  "id": "mask_shards",
  "label": "Mask Shards",
  "desc": "Fragments that increase Hornet's maximum health.",
  "contrib": 5,
  "items": [ ... ]
}
```

| Field   | Type   | Description                      |
| ------- | ------ | -------------------------------- |
| id      | string | Unique category identifier.      |
| label   | string | Display name.                    |
| desc    | string | Category description.            |
| contrib | number | Weight in completion percentage. |
| items   | array  | List of item definitions.        |

### 4.2 Item Object

```json
{
  "id": "nail1",
  "label": "Sharpened Needle",
  "flag": "nailUpgrades",
  "type": "level",
  "required": 1,
  "category": "Needle Upgrades",
  "icon": "icons/2_Sharpened_Needle.png",
  "description": "The blade is honed to a fine edge.",
  "cost": "Free",
  "obtain": "The Needle can be upgraded by Pinmaster Plinney",
  "link": "https://hollowknight.wiki/w/Needle"
}
```

| Field          | Type                | Description                           |
| -------------- | ------------------- | ------------------------------------- |
| id             | string              | Unique internal identifier.           |
| label          | string              | Display name.                         |
| category       | string              | Category reference.                   |
| flag           | string              | Key from save data.                   |
| scene          | string _(optional)_ | Scene context for nested flags.       |
| type           | string              | Defines logic for completion.         |
| required       | number _(optional)_ | Minimum value for `level` type.       |
| value          | number _(optional)_ | Exact match for `flagInt`.            |
| icon           | string              | Path to icon image.                   |
| map            | string _(optional)_ | Map image for item location.          |
| description    | string              | Description for display.              |
| cost           | string _(optional)_ | Cost or requirement to obtain.        |
| obtain         | string _(optional)_ | How the item is acquired.             |
| exclusiveGroup | string _(optional)_ | Group of mutually exclusive variants. |
| link           | string _(optional)_ | External wiki or documentation URL.   |

### 4.3 Supported Type Values

| Type         | Meaning                     | Logic                           |
| ------------ | --------------------------- | ------------------------------- |
| flag         | Simple boolean flag.        | `save[flag] === true`           |
| sceneBool    | Boolean nested under scene. | `save[scene]?.[flag] === true`  |
| sceneVisited | Scene visit marker.         | `save[scene]?.visited === true` |
| level        | Numeric progression.        | `save[flag] >= required`        |
| flagInt      | Exact integer match.        | `save[flag] === value`          |
| quest        | Quest completion flag.      | `Boolean(save[flag])`           |
| tool         | Equipment or tool obtained. | `Boolean(save[flag])`           |
| collectable  | Unique collectible.         | `Boolean(save[flag])`           |

## 5. Flag Recognition Logic

### 5.1 What Are Flags

Flags are internal variables stored in the Silksong save file that record the player's progress and actions.
Each flag represents a specific state in the game: a collected item, a defeated boss, or a completed quest.

Example of flags inside a decoded save file:

```json
{
  "hasDash": true,
  "PurchasedBonebottomHeartPiece": true,
  "Collectable Item Pickup": false,
  "Silk Spool": { "Bone_11b": true }
}
```

These names come directly from the game's C# code (Unity serialization).
When the player performs an action, the game sets the corresponding flag to `true` or updates its value (integer for upgrades).

### 5.2 How Flags Are Used by the Tracker

Each entry in `main.json` includes a `flag` field that tells the app which save value to check.

Example item:

```json
{
  "id": "everbloom",
  "label": "Everbloom",
  "flag": "Collectable Item Pickup",
  "type": "collectable"
}
```

When a save is decoded, the tracker compares each `flag` in the static JSON data with the decoded `saveData` object.

The key logic:

```js
const value =
  item.type?.startsWith("region") || item.region
    ? save[item.region]?.[item.flag]
    : save[item.flag];
```

This checks whether the flag exists either globally or within a specific scene.

If the flag exists and is `true`, the item is marked as obtained.

### 5.3 Example Flag Mapping

| Item          | Flag                          | Example in save file                     | Result   |
| ------------- | ----------------------------- | ---------------------------------------- | -------- |
| Everbloom     | Collectable Item Pickup       | `"Collectable Item Pickup": true`        | Obtained |
| Mask Shard #1 | PurchasedBonebottomHeartPiece | `"PurchasedBonebottomHeartPiece": false` | Missing  |
| Swift Step    | hasDash                       | `"hasDash": true`                        | Obtained |

### 5.4 Why Flags Have Readable Names

Flags such as `"Collectable Item Pickup"`, `"Heart Piece"`, or `"Beastfly Hunt"` are not arbitrary -
they are the exact string identifiers used by the game's code when saving data.

These names come from:

- Unity's C# variable names serialized in the `.dat` file;
- Community reverse-engineering of Silksong's prototype saves;
- Empirical testing (comparing flags before and after certain in-game actions).

### 5.5 Summary

| Concept     | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| Flag        | A key stored in the Silksong save representing progress or events.  |
| Source      | Unity's internal C# save data structure.                            |
| Used In     | The `flag` field inside `main.json` items.                          |
| Check Logic | `save[flag]` or `save[scene][flag]` depending on item type.         |
| Example     | `"Collectable Item Pickup"` → used to detect Everbloom collectable. |

### 5.6 Example Definition in `main.json`

```json
{
  "id": "everbloom",
  "label": "Everbloom",
  "flag": "Collectable Item Pickup",
  "type": "collectable",
  "icon": "icons/Everbloom.png",
  "description": "Return to the Snail Shamans and complete the memory sequence.",
  "link": "https://hollowknight.wiki/w/Everbloom"
}
```

## 6. User Interface (`index.html`)

| Section      | Description                                         |
| ------------ | --------------------------------------------------- |
| Sidebar      | Navigation between Home, Main%, Essentials, Bosses. |
| Topbar       | Contains toggles and the upload button.             |
| Main Wrapper | Displays content for each tab.                      |
| Overlays     | Upload modal and information modal.                 |

## 7. Security and Privacy

- 100% client-side execution.
- No server calls or network requests.
- Save files are never uploaded or stored.
- Data exists only in memory during session runtime.
- Decryption uses well-established open-source libraries.

## 8. Completion Percentage

Each category defines a `contrib` value representing its weight in overall completion.
A future feature will compute total completion using:

```txt
completion% = Σ (completedItems / totalItems) × contrib
```

## 9. Adding New Tabs

To add a new tab, follow these steps:

1. Add a sidebar link in `index.html` with a unique `data-tab` attribute.
2. Add a corresponding `<section>` element with ID `yourtab-section`.
3. Create an async function `updateYourTabContent()` in `script.js` that fetches a JSON file and renders content using `renderGenericGrid`.
4. Register the new function in the `updater` object used by tab switching and toggles.

Example:

```js
async function updateCharmsContent() {
  const response = await fetch("data/charms.json");
  const charmsData = await response.json();
  renderGenericGrid({ containerId: "charms-grid", data: charmsData });
}

const updater = {
  bosses: updateBossesContent,
  main: updateMainContent,
  essentials: updateNewTabContent,
  charms: updateCharmsContent,
};
```

## 10. Async Functions and Modular Structure

All data-loading operations now use **`async/await`** for clarity and better control.

Example:

```js
async function updateBossesContent() {
  const response = await fetch("data/bosses.json?" + Date.now());
  const data = await response.json();
  // Rendering logic...
}
```

Benefits:

| Aspect         | Advantage                                           |
| -------------- | --------------------------------------------------- |
| Readability    | Code looks sequential and easy to follow.           |
| Error Handling | Works with `try/catch` blocks for unified control.  |
| Modularity     | Each tab uses a separate async updater.             |
| Flexibility    | Easier to expand with new content and JSON sources. |

## 11. Technology Stack

| Layer        | Technology                            | Purpose            |
| ------------ | ------------------------------------- | ------------------ |
| Front-End    | HTML5, CSS3, Font Awesome             | UI and layout      |
| Logic        | TypeScript (ES6 Modules, async/await) | Core functionality |
| Cryptography | CryptoJS                              | AES decryption     |
| Data         | JSON                                  | Static metadata    |
| Hosting      | GitHub Pages                          | Static hosting     |

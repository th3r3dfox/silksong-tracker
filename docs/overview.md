# Silksong Tracker - Technical Overview

## Overview

Silksong Tracker is a browser-based web application that analyzes and visualizes save files from _Hollow Knight: Silksong_. It decodes encrypted `.dat` files locally in the browser, extracts progression data, and displays it in an interactive interface. All operations occur locally, ensuring privacy and data safety.

## Architecture

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

## Data Flow

### File Upload

1. The user uploads a `.dat` save file via the "Upload Save" button or drag-and-drop zone.
2. The file is read using the File API and converted to a `Uint8Array`.
3. The bytes are passed to the decoder, which returns a JavaScript object.

### Save Decoding (`SaveDecoder.js`)

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

### Save Parsing

The object is passed to the parser, which validates that it has the correct fields using Zod.

## Flag Recognition Logic

### What Are Flags

Flags are internal variables stored in the Silksong save file that record the player's progress and actions. Each flag represents a specific state in the game: a collected item, a defeated boss, or a completed quest.

Example of flags inside a decoded save file:

```json
{
  "hasDash": true,
  "PurchasedBonebottomHeartPiece": true,
  "Collectable Item Pickup": false,
  "Silk Spool": { "Bone_11b": true }
}
```

These names come directly from the game's C# code (Unity serialization). When the player performs an action, the game sets the corresponding flag to `true` or updates its value (integer for upgrades).

### How Flags Are Used by the Tracker

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

### Example Flag Mapping

| Item          | Flag                          | Example in save file                     | Result   |
| ------------- | ----------------------------- | ---------------------------------------- | -------- |
| Everbloom     | Collectable Item Pickup       | `"Collectable Item Pickup": true`        | Obtained |
| Mask Shard #1 | PurchasedBonebottomHeartPiece | `"PurchasedBonebottomHeartPiece": false` | Missing  |
| Swift Step    | hasDash                       | `"hasDash": true`                        | Obtained |

### Why Flags Have Readable Names

Flags such as `"Collectable Item Pickup"`, `"Heart Piece"`, or `"Beastfly Hunt"` are not arbitrary -
they are the exact string identifiers used by the game's code when saving data.

These names come from:

- Unity's C# variable names serialized in the `.dat` file;
- Community reverse-engineering of Silksong's prototype saves;
- Empirical testing (comparing flags before and after certain in-game actions).

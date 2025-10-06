# Silksong Tracker — Technical Documentation

## 1. Overview

Silksong Tracker is a browser-based web application that analyzes and visualizes save files from *Hollow Knight: Silksong*.  
It decodes encrypted `.dat` files locally in the browser, extracts progression data, and displays it in an interactive interface.  
All operations occur locally, ensuring privacy and data safety.

---

## 2. Architecture

The project is entirely client-side, structured as follows:

```
silksong-tracker/
│
├── index.html               # Main UI and layout
│
├── js/
│   ├── script.js            # Core logic and rendering
│   ├── SaveDecoder.js       # Binary decoding and AES decryption
│   ├── constants.js         # Unity header and AES key constants
│
├── data/
│   ├── main.json            # Database of items, upgrades, and skills
│   ├── bosses.json          # Optional boss data
│
├── css/style.css            # Styles and theme definitions
├── assets/                  # Icons, fonts, and images
└── README.md / docs/        # Documentation
```

---

## 3. Data Flow

### 3.1 File Upload

1. The user uploads a `.dat` save file via the “Upload Save” button or drag-and-drop zone.  
2. The file is read using the File API and converted to a `Uint8Array`.  
3. The bytes are passed to the decoder:

```js
import { decodeSilksongSave } from './SaveDecoder.js';
const saveData = decodeSilksongSave(fileBytes);
```

---

### 3.2 Save Decoding (`SaveDecoder.js`)

The Silksong save file is a C# serialized, AES-encrypted, and zlib-compressed binary.  
Decoding happens in four main steps:

| Step | Function | Description |
|------|-----------|-------------|
| 1 | `removeHeader(bytes)` | Removes Unity/C# binary header. |
| 2 | Base64 reconstruction | Rebuilds the Base64 string from byte data. |
| 3 | AES decryption | Decrypts using a static key defined in `constants.js`. |
| 4 | Decompression | Inflates the zlib data using Pako and parses JSON. |

**Example constants (`constants.js`):**

```js
export const AES_KEY_STRING = "UKu52ePUBwetZ9wNX88o54dnfKRu0T1l";
export const CSHARP_HEADER = new Uint8Array([
  0, 1, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0
]);
```

**Decoded output example:**

```js
{
  "hasDash": true,
  "Heart Piece": { "Dock_08": true, "Weave_05b": false },
  "Silk Spool": { "Bone_11b": true },
  "PlayTime": 17482,
  "Completion": 58.25
}
```

---

### 3.3 Data Correlation and Rendering (`script.js`)

Static data from `data/main.json` and `data/bosses.json` defines all trackable items.  
Each JSON entry includes a flag and logic to determine if it’s completed or missing.

**Example:**

```json
{
  "id": "nail1",
  "label": "Sharpened Needle",
  "flag": "nailUpgrades",
  "type": "level",
  "required": 1
}
```

**Logic in script.js:**

```js
const value =
  (item.type?.startsWith("region") || item.region)
    ? save[item.region]?.[item.flag]
    : save[item.flag];
```

Each item is rendered in the grid with its current state (obtained / missing).

---

## 4. Data Model — `main.json`

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

| Field | Type | Description |
|--------|------|-------------|
| id | string | Unique category identifier. |
| label | string | Display name. |
| desc | string | Category description. |
| contrib | number | Weight in completion percentage. |
| items | array | List of item definitions. |

---

### 4.2 Item Object

```json
{
  "id": "nail1",
  "label": "Sharpened Needle",
  "flag": "nailUpgrades",
  "type": "level",
  "required": 1,
  "category": "Needle Upgrades",
  "icon": "assets/icons/2_Sharpened_Needle.png",
  "description": "The blade is honed to a fine edge.",
  "cost": "Free",
  "obtain": "The Needle can be upgraded by Pinmaster Plinney",
  "link": "https://hollowknight.wiki/w/Needle"
}
```

| Field | Type | Description |
|--------|------|-------------|
| id | string | Unique internal identifier. |
| label | string | Display name. |
| category | string | Category reference. |
| flag | string | Key from save data. |
| scene | string *(optional)* | Scene context for nested flags. |
| type | string | Defines logic for completion. |
| required | number *(optional)* | Minimum value for `level` type. |
| value | number *(optional)* | Exact match for `flagInt`. |
| icon | string | Path to icon image. |
| map | string *(optional)* | Map image for item location. |
| description | string | Description for display. |
| cost | string *(optional)* | Cost or requirement to obtain. |
| obtain | string *(optional)* | How the item is acquired. |
| exclusiveGroup | string *(optional)* | Group of mutually exclusive variants. |
| link | string *(optional)* | External wiki or documentation URL. |

---

### 4.3 Supported Type Values

| Type | Meaning | Logic |
|------|----------|-------|
| flag | Simple boolean flag. | `save[flag] === true` |
| sceneBool | Boolean nested under scene. | `save[scene]?.[flag] === true` |
| sceneVisited | Scene visit marker. | `save[scene]?.visited === true` |
| level | Numeric progression. | `save[flag] >= required` |
| flagInt | Exact integer match. | `save[flag] === value` |
| quest | Quest completion flag. | `Boolean(save[flag])` |
| tool | Equipment or tool obtained. | `Boolean(save[flag])` |
| collectable | Unique collectible. | `Boolean(save[flag])` |

---

## 5. JavaScript Components

| Function | File | Description |
|-----------|------|-------------|
| `removeHeader(bytes)` | SaveDecoder.js | Removes the Unity header bytes. |
| `decodeSilksongSave(fileBytes)` | SaveDecoder.js | Executes the full decode process (AES → Inflate → JSON). |
| `renderGenericGrid({ data, containerId })` | script.js | Renders items into the UI grid. |
| `switchTab(tabId)` | script.js | Handles tab navigation. |
| `updateFilters()` | script.js | Applies “missing” and “spoiler” filters. |

---

## 6. User Interface (`index.html`)

### Layout

| Section | Description |
|----------|-------------|
| Sidebar | Navigation between Home, Main%, Essentials, Bosses. |
| Topbar | Contains toggles and the upload button. |
| Main Wrapper | Displays content for each tab. |
| Overlays | Upload modal and information modal. |

### External Dependencies

| Library | Purpose | Source |
|----------|----------|--------|
| CryptoJS | AES decryption | cdnjs |
| Pako.js | zlib decompression | cdnjs |
| Font Awesome | Icons | cdnjs |
| Google Fonts | Typography | fonts.googleapis.com |

Scripts are loaded as ES6 modules (`type="module"`) for modular imports.

---

## 7. Security and Privacy

- 100% client-side execution.  
- No server calls or network requests.  
- Save files are never uploaded or stored.  
- Data exists only in memory during session runtime.  
- Decryption uses well-established open-source libraries.

---

## 8. Completion Percentage (Planned)

Each category defines a `contrib` value representing its weight in overall completion.  
A future feature will compute total completion using:

```
completion% = Σ (completedItems / totalItems) × contrib
```

---

## 9. Planned Features

- Map previews for each item using the `map` field.  
- Real-time completion percentage.  
- LocalStorage caching of last decoded save.  
- Search and filtering by flag or category.  
- Detailed boss viewer using `bosses.json`.

---

## 10. Technology Stack

| Layer | Technology | Purpose |
|--------|-------------|----------|
| Front-End | HTML5, CSS3, Font Awesome | UI and layout |
| Logic | JavaScript (ES6 Modules) | Core functionality |
| Cryptography | CryptoJS | AES decryption |
| Compression | Pako.js | zlib decompression |
| Data | JSON | Static metadata |
| Hosting | GitHub Pages | Static hosting |

---

## 11. Credits

Inspired by *ReznorMichael’s “Hollow Knight Save Analyzer”*  
A non-commercial fan project not affiliated with Team Cherry.  

Version: v0.2.0

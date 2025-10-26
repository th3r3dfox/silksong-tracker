import loader from "@monaco-editor/loader";
import type * as monaco from "monaco-editor";
import { getHTMLElement } from "../elements.ts";
import { getSaveData } from "../save-data.ts";
import { showToast } from "../utils.ts";

const rawSaveDataCopy = getHTMLElement("raw-save-data-copy");
const rawSaveJsonDataDownload = getHTMLElement("raw-save-json-data-download");
const rawSaveDataOutput = getHTMLElement("raw-save-data-output");

let editor: monaco.editor.IStandaloneCodeEditor | undefined;
let editorInitPromise: Promise<void> | undefined;

export function initRawSaveData(): void {
  // Copy JSON to clipboard.
  rawSaveDataCopy.addEventListener("click", () => {
    const text = editor?.getValue() ?? "";
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("📋 JSON copied to clipboard.");
      })
      .catch(() => {
        showToast("❌ Copy failed.");
      });
  });

  // Download JSON file
  rawSaveJsonDataDownload.addEventListener("click", () => {
    const saveData = getSaveData();
    if (saveData === undefined) {
      showToast("❌ No save loaded yet.");
      return;
    }
    const saveDataString = JSON.stringify(saveData, undefined, 2);
    const blob = new Blob([saveDataString], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "silksong-save.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Lazy initialization
async function ensureEditorInitialized() {
  if (editor !== undefined) {
    return; // Already initialized
  }

  editorInitPromise = (async () => {
    try {
      const monacoInstance = await loader.init();
      editor = monacoInstance.editor.create(rawSaveDataOutput, {
        value: "",
        language: "javascript",
        minimap: { enabled: false },
        theme: "vs-dark",
        fontSize: 14,
        lineNumbers: "on",
        renderWhitespace: "selection",
        formatOnPaste: true,
        formatOnType: false,
        wordWrap: "on",
        bracketPairColorization: { enabled: true },
        folding: true,
        foldingHighlight: true,
        showFoldingControls: "always",
        matchBrackets: "always",
        contextmenu: true,
        readOnly: true,
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: "never",
          seedSearchStringFromSelection: "always",
        },
      });
    } catch (error) {
      console.error("Failed to initialize Monaco editor:", error);
      showToast("❌ Failed to initialize code editor");
      throw error;
    }
  })();

  await editorInitPromise;
}

export async function updateTabRawSaveData(): Promise<void> {
  // Initialize editor on first access.
  await ensureEditorInitialized();

  const saveData = getSaveData();
  if (saveData === undefined) {
    editor?.setValue("No save file loaded.");
    return;
  }
  try {
    const jsonText = JSON.stringify(saveData, undefined, 2);
    editor?.setValue(jsonText);
  } catch (error) {
    editor?.setValue(`❌ Failed to display raw save: ${error}`);
    console.error(error);
  }
}

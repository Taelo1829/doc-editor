interface SaveFilePickerWindow {
  showSaveFilePicker(options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }): Promise<{ name: string; createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;
}

function supportsSavePicker(target: Window): target is Window & SaveFilePickerWindow {
  return "showSaveFilePicker" in target;
}

/**
 * Saves the PDF. Uses the browser's "Save as" dialog where available (Chrome, Edge)
 * and falls back to a regular download elsewhere.
 * Returns the saved file's name, or null if the user cancelled.
 */
export async function saveBytes(bytes: Uint8Array, suggestedName: string): Promise<string | null> {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  if (supportsSavePicker(window)) {
    return saveWithPicker(window, blob, suggestedName);
  }
  downloadBlob(blob, suggestedName);
  return suggestedName;
}

async function saveWithPicker(
  target: SaveFilePickerWindow,
  blob: Blob,
  suggestedName: string,
): Promise<string | null> {
  try {
    const handle = await target.showSaveFilePicker({
      suggestedName,
      types: [{ description: "PDF document", accept: { "application/pdf": [".pdf"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return handle.name;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

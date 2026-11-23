/**
 * Share or download a file. On iOS (and Android) the share sheet takes the
 * file when `navigator.canShare({ files })` is true; else an anchor download.
 */
export type ShareResult = "shared" | "downloaded" | "cancelled";

export async function shareOrDownload(
  data: BlobPart,
  fileName: string,
  mimeType: string,
): Promise<ShareResult> {
  const file = new File([data], fileName, { type: mimeType });
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        return "cancelled";
      // Fall through to the download.
    }
  }
  downloadFile(file, fileName);
  return "downloaded";
}

/** An anchor download (desktop browsers). */
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

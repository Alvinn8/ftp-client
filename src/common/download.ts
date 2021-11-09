/**
 * Download a blob to the user's device.
 *
 * @param blob The blob to download.
 * @param name The name of the blob to download.
 */
export default function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = name;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}
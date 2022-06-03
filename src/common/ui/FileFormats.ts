/**
 * Get the bootstrap-icons name for the icon to display for this file.
 * 
 * @param fileName The full file name.
 * @returns The name of the icon.
 */
export function getIconFor(fileName: string): string {
    if (fileName.endsWith(".gz")) {
        fileName = fileName.substring(0, fileName.length - 3);
    }
    const index = fileName.lastIndexOf(".");
    const extention = fileName.substring(index);
    switch(extention) {
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".tif":
        case ".tiff":
        case ".gif":
        case ".webp":
        case ".heif":
        case ".ico":
            return "file-earmark-image";

        case ".txt":
        case ".log":
        case ".properties":
        case ".yml":
        case ".yaml":
        case ".toml":
        case ".json":
        case ".cfg":
        case ".conf":
        case ".ini":
        case ".html":
        case ".js":
        case ".ts":
        case ".tsx":
        case ".java":
        case ".md":
        case ".MD":
        case ".css":
        case ".svg":
        case ".xml":
            return "file-earmark-text";

        case ".pdf":
            return "file-earmark-pdf";

        case ".mp3":
        case ".ogg":
        case ".wav":
        case ".m4a":
        case ".webm":
            return "file-earmark-music";

        case ".zip":
        case ".rar":
        case ".jar":
            return "file-earmark-zip";
        
        case ".patch":
        case ".diff":
            return "file-earmark-diff";

        case ".dat":
        case ".dat_old":
        case ".dat_new":
        case ".nbt":
        case ".mca":
            return "file-earmark-binary";

        default: return "file-earmark";
    }
}

/**
 * The type of a file. Used to decide how to open it.
 */
export type FileType = "text" | "image" | "unknown";

/**
 * Get the {@link FileType} of the file name.
 *
 * @param fileName The full file name.
 * @returns The file type.
 */
export function getFileType(fileName: string): FileType {
    const icon = getIconFor(fileName);
    switch (icon) {
        case "file-earmark-text":
        case "file-earmark-diff":
            return "text";
        case "file-earmark-image":
            return "image";
    }

    return "unknown";
}
/**
 * Throws by the CacheFolderContentProvider when folder entries are not cached.
 * @deprecated
 */
export default class NotCachedError extends Error {
    constructor() {
        super();
        this.name = "NotCachedError";
    }
}
import CacheFolderContentProvider from "./CacheFolderContentProvider";
import FTPFolderContentProvider from "./FTPFolderContentProvider";
import MainFolderContentProvider from "./MainFolderContentProvider";

/**
 * Holds the different folder content providers.
 * @deprecated
 */
namespace FolderContentProviders {
    /** Fetch folder entries from the ftp server. @deprecated */
    export const FTP = new FTPFolderContentProvider();
    /** Get folder entries from cache or throw an error. @deprecated */
    export const CACHE = new CacheFolderContentProvider();
    /** Get cached folder entries if they exist or fetch from the ftp server. @deprecated */
    export const MAIN = new MainFolderContentProvider();
}
export default FolderContentProviders;

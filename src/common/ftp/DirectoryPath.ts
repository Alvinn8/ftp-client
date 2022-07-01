/**
 * The path of a directory, for example a working directory.
 */
export default class DirectoryPath {
    private path: string;
    
    constructor(path: string) {
        this.path = path;
    }

    cd(path: string) {
        if (!this.path.endsWith("/")) this.path += "/";
        if (path.startsWith("/")) {
            this.path = path;
        } else {
            this.path += path;
        }
        return this;
    }

    cdup() {
        const parts = this.path.split("/");
        parts.pop();
        this.path = parts.join("/");
        if (this.path == "") {
            this.path = "/";
        }
        return this;
    }

    get() {
        return this.path;
    }
}
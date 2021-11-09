/*
 * Web server that looks for files in the public folder, then in the build/website-dev folder.
 */

const http = require("http");
const path = require("path");
const fs = require("fs");

/** The port to run the server on. */
const PORT = 8080;
/** Places to look for files. */
const PLACES = ["public", "build/website-dev"];
/** Simple mime types to send for file extentions */
const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg"
};

const server = http.createServer(async function(req, res) {
    let url = req.url.split("#")[0].split("?")[0];
    console.log("Request for url " + url);
    if (url == "/") url = "/index.html";
    url = url.substring(1);
    if (url.includes("..")) {
        res.statusCode = 400;
        res.end();
        return;
    }
    for (const place of PLACES) {
        const filePath = path.resolve(place, url);
        let file;
        try {
            file = await fs.promises.readFile(filePath);
        } catch(e) {
            if (e.code != "ENOENT") throw e;
            continue;
        }
        const extname = path.extname(filePath);
        const mimeType = MIME_TYPES[extname];
        if (mimeType) {
            res.setHeader("Content-Type", mimeType);
        }
        res.end(file);
        return;
    }
    res.statusCode = 404;
    res.end();
});

server.listen(PORT, function() {
    console.log(`Server is running on: http://localhost:${PORT}`);
});
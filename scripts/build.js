/*
 * Script for building the project that transpiles all typescript into javascript.
 *
 * Due to the complexity of this project, holding a website, electron app and node
 * script that all need to share some code with each other, but use different module
 * formats (web just exposes to the global scope, node uses commonjs's require but
 * typescript only allows esm-like import/export keywords) we have this script to
 * build the project as no existing tools can do exactly what we want.
 */

const babel = require("@babel/core");
const rollup = require("rollup");
const { minify } = require("terser");
const fsNormal = require("fs");
const fs = fsNormal.promises;
const path = require("path");
const { performance } = require('perf_hooks');
const { exec } = require('child_process');

/** The location of the website when developing it. */
const WEBSITE_DEV_FOLDER = "build/website-dev";
/** The location of the bundled website used in production. */
const WEBSITE_DIST_FOLDER = "build/website-dist";
/** The location of the built proxy server. */
const SERVER_FOLDER = "build/server";

// Pinned skypack urls optimized for production
const REACT_PINNED_URL = "https://cdn.skypack.dev/pin/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/mode=imports,min/optimized/react.js";
const REACT_DOM_PINNED_URL = "https://cdn.skypack.dev/pin/react-dom@v17.0.1-oZ1BXZ5opQ1DbTh7nu9r/mode=imports,min/optimized/react-dom.js";

/**
 * Traverse a directory and all it's subdirectories.
 * 
 * @param {string} directory The directory to traverse.
 * @param {(dirPath, dirName) => void} directoryHandler The handler called at the start of each directory read.
 * @param {(filePath, fileName) => void} fileHandler The handler called for each file.
 */
async function traverseDirectory(directory, directoryHandler, fileHandler) {
    async function readDirectory(dir, dirName) {
        const value = await directoryHandler(dir, dirName);
        if (value == SKIP_DIRECTORY) return;

        const entries = await fs.readdir(dir);
        for (const entryName of entries) {
            const entryPath = path.join(dir, entryName);
            const stat = await fs.stat(entryPath);
            if (stat.isDirectory()) {
                await readDirectory(entryPath, entryName);
            } else {
                await fileHandler(entryPath, entryName);
            }
        }
    }

    await readDirectory(directory);
}

const SKIP_DIRECTORY = 1;

// === website ===

/**
 * Copy the contents of the "public" folder into the "build" folder and make the
 * modifications necesary in the index.html file.
 * 
 * @param {string} folder one of WEBSITE_DEV_FOLDER or WEBSITE_DIST_FOLDER
 */
async function copyPublicFolder(folder) {
    console.log("Copying public folder");
    await traverseDirectory("public",
    async function dir(dirPath, dirName) {
        try {
            await fs.mkdir(dirPath.replace(/^public/, folder), { recursive: true });
        } catch(ignored) {}
    },
    async function file(filePath, fileName) {
        const dest = filePath.replace(/^public/, folder);
        console.log(`Copying from "${filePath}" to "${dest}"`);
        await fs.copyFile(filePath, dest);
    });
}

async function transpileWebsiteTypescript() {
    console.log("Transpiling typescript");
    let files = 0;
    await traverseDirectory("src",
    async function dir(dirPath, dirName) {
        if (dirName == "server") return SKIP_DIRECTORY;

        try {
            await fs.mkdir(dirPath.replace(/^src/, WEBSITE_DEV_FOLDER + "/js"));
        } catch (ignored) {}
    },
    async function file(filePath, fileName) {
        if (/.tsx?$/.test(fileName)) {
            const result = await babel.transformFileAsync(filePath);

            await fs.writeFile(filePath.replace(/^src/, WEBSITE_DEV_FOLDER + "/js").replace(/\.tsx?$/, ".js"), result.code, "utf-8");
            files++;
        }
    });
    console.log("Compiled " + files + " typescript file" + (files.length == 1 ? "" : "s"));
}

async function buildDevWebsite() {
    await copyPublicFolder(WEBSITE_DEV_FOLDER);
    await transpileWebsiteTypescript();
}

function watchWebsite() {
    fsNormal.watch("src", { recursive: true }, async function(event, fileName) {
        if (event != "change") return;

        const filePath = path.join("src", fileName);

        if (/.tsx?$/.test(fileName) && !filePath.startsWith("src/server")) {
            const start = performance.now();
            const result = await babel.transformFileAsync(filePath);

            await fs.writeFile(filePath.replace(/^src/, WEBSITE_DEV_FOLDER + "/js").replace(/\.tsx?$/, ".js"), result.code, "utf-8");
            console.log(`[babel]            Transpiled ${filePath} in ${Math.round(performance.now() - start)} ms`);
        }
    });
}

async function buildDistWebsite() {
    await buildDevWebsite();
    await copyPublicFolder(WEBSITE_DIST_FOLDER);
    
    const bundle = await rollup.rollup({
        input: WEBSITE_DEV_FOLDER + "/js/web/index.js",
        external: [REACT_PINNED_URL, REACT_DOM_PINNED_URL]
    });

    const { output } = await bundle.generate({
        format: "iife",
        globals: {
            [ REACT_PINNED_URL ]: "React",
            [ REACT_DOM_PINNED_URL ]: "ReactDOM"
        }
    });

    for (const chunk of output) {
        if (chunk.type == "chunk") {
            const result = await minify(chunk.code);
            // const result = chunk;
            await fs.writeFile(WEBSITE_DIST_FOLDER + "/bundle.js", result.code, "utf-8");
        }
    }

    let indexHtml = await fs.readFile(WEBSITE_DIST_FOLDER + "/index.html", "utf-8");
    const index = indexHtml.indexOf("<!-- JavaScript -->");
    const before = indexHtml.substring(0, index);
    const tmp1 = indexHtml.substring(index);
    const after = tmp1.substring(tmp1.indexOf("</script>") + "</script>".length);

    const n = "\n        ";

    const middle = ""
    + `<!-- React -->` + n
    + `<script src="https://unpkg.com/react@17/umd/react.production.min.js" crossorigin></script>` + n
    + `<script src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js" crossorigin></script>` + "\n" + n
    + `<!-- JavaScript -->` + n
    + `<script src="bundle.js" defer></script>`
    ;

    indexHtml = before + middle + after;

    await fs.writeFile(WEBSITE_DIST_FOLDER + "/index.html", indexHtml, "utf-8");
}

// === server ===

const STAR_IMPORT_REGEX = /import \* as (?<varname>\w+) from (?<import>"[\w-.\/]+")/;
const DESTRUCT_IMPORT_REGEX = /import (?<destruct>{ [\w, ]+ }) from (?<import>"[\w-.\/]+");/;
const DEFAULT_IMPORT_REGEX = /import (?<varname>\w+) from (?<import>"[\w-.\/]+")/;
const EXPORT_REGEX = /export( (let|const|class))? (?<exportname>\w+)/;
async function buildServer() {
    let files = 0;
    async function transpiledirectory(directory) {
        await traverseDirectory(directory,
        async function dir(dirPath, dirName) {
            try {
                await fs.mkdir(dirPath.replace(/^src/, SERVER_FOLDER), { recursive: true });
            } catch (ignored) {}
        },
        async function file(filePath, fileName) {
            const result = await babel.transformFileAsync(filePath);
            let code = result.code;
            let exports = [];
            const lines = code.split("\n");
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith("import")) {
                    let res = STAR_IMPORT_REGEX.exec(line);
                    if (res == null) {
                        res = DEFAULT_IMPORT_REGEX.exec(line);
                    }
                    if (res != null) {
                        const varname = res.groups["varname"];
                        const importString = res.groups["import"];
                        lines[i] = `const ${varname} = require(${importString});`;
                        continue;
                    }
                    res = DESTRUCT_IMPORT_REGEX.exec(line);
                    if (res != null) {
                        const destruct = res.groups["destruct"];
                        const importString = res.groups["import"];
                        lines[i] = `const ${destruct} = require(${importString});`;
                        continue;
                    }
                }
                if (line.startsWith("export ")) {
                    if (line.startsWith("export default")) {
                        lines[i] = "module.exports = " + line.substring("export default".length);
                    } else {
                        const res = EXPORT_REGEX.exec(line);
                        const exportname = res.groups["exportname"];
                        lines[i] = line.substring("export ".length);
                        exports.push(exportname);
                    }
                }
            }
            for (const exportname of exports) {
                lines.push(`module.exports.${exportname} = ${exportname};`);
            }
            code = lines.join("\n");

            await fs.writeFile(filePath.replace(/^src/, SERVER_FOLDER).replace(/\.tsx?$/, ".js"), code, "utf-8");
            files++;
        });
    }
    await transpiledirectory("src/server/src");
    await transpiledirectory("src/protocol");
    console.log("Compiled " + files + " typescript file" + (files.length == 1 ? "" : "s"));
}

// === dev ===

function runServer() {
    const child = exec("node build/server/server/src/index.js");
    child.stdout.on("data", function(data) {
        process.stdout.write("[websocket-server] " + data);
    });
    child.stderr.on("data", function(data) {
        process.stderr.write("[websocket-server] " + data);
    });
}

function runDevHttpServer() {
    const child = exec("node scripts/dev-server.js");
    child.stdout.on("data", function(data) {
        process.stdout.write("[http-server]      " + data);
    });
    child.stderr.on("data", function(data) {
        process.stderr.write("[http-server]      " + data);
    });
}

async function dev() {
    console.log("Building website");
    await buildDevWebsite();
    console.log("Building websocket server");
    await buildServer();
    console.log("\nWatching changes & starting servers");
    watchWebsite();
    runDevHttpServer();
    runServer();
}

switch (process.argv[2]) {
    case "build-website-dev": {
        buildDevWebsite();
        break;
    }
    case "dev": {
        dev();
        break;
    }
    case "build-server": {
        buildServer();
        break;
    }
    case "build-website-dist": {
        buildDistWebsite();
        break;
    }
    default: {
        console.log("Unknown argument");
        process.exit(1);
        break;
    }
}
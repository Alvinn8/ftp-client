import * as esbuild from "esbuild";

esbuild.build({
    entryPoints: [import.meta.dirname + "/../src/server/index.ts"],
    platform: "node",
    format: "esm",
    bundle: true,
    outfile: "bundle.js",
    packages: "external",
});

import * as esbuild from "esbuild";

esbuild.build({
    entryPoints: [import.meta.dirname + "/../src/server/index.ts"],
    platform: "node",
    format: "esm",
    bundle: true,
    outfile: "bundle.js",
    packages: "external",
    define: {
        "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
    },
});

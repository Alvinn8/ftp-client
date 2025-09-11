require("esbuild").build({
    entryPoints: [__dirname + "/../src/server/index.ts"],
    platform: "node",
    format: "cjs",
    bundle: true,
    outfile: "bundle.js",
    external: ["ws", "basic-ftp", "ssh2-sftp-client"]
});
import { loadWASM } from "onigasm";
// @ts-ignore
import wasmURL from "onigasm/lib/onigasm.wasm?url";

export async function setupTextMate() {
    await loadWASM(wasmURL);
}
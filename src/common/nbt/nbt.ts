import NbtReader from "./NbtReader";
import NbtCompound from "./tag/NbtCompound";
import NbtEnd from "./tag/NbtEnd";
import NbtTag from "./tag/NbtTag";

export async function readJavaEditionUncompressedNbt(data: Blob): NbtCompound {
    const reader = new NbtReader(new Uint8Array(await data.arrayBuffer()));
    const root = new NbtCompound();
    root.read(reader);
    return root;
}

export function getTagFromId(id: number): NbtTag {
    switch (id) {
        case 0: return NbtEnd;
        case 10: return new NbtCompound();
    
        default:
            throw new Error("Unknown tag type: " + id);
    }
}
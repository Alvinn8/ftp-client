import ContextMenuEntry from "../../../contextmenu/ContextMenuEntry";
import ContextMenuPopulator from "../../../contextmenu/ContextMenuPopulator";
import Dialog from "../../../Dialog";
import { unexpectedErrorHandler } from "../../../error";
import { getTagFromId } from "../../../nbt/nbt";
import { ArrayNbtTag, NbtByte, NbtByteArray, NbtCompound, NbtDouble, NbtFloat, NbtInt, NbtIntArray, NbtList, NbtLong, NbtLongArray, NbtShort, NbtString, NumberNbtTag } from "../../../nbt/nbtTags";
import { copyToClipboard } from "../../../utils";

export type CompoundParentData = { parent: NbtCompound; key: string; reRenderUi: () => void; };
export type ListParentData = { parent: NbtList; index: number; reRenderUi: () => void; };
export type ParentData = CompoundParentData | ListParentData | null;

function contextMenuForParent(parent: ParentData): ContextMenuEntry[] {
    if (parent == null) {
        return [];
    }
    if (parent.parent instanceof NbtCompound) {
        return contextMenuForCompoundParent(parent as CompoundParentData);
    }
    if (parent.parent instanceof NbtList) {
        return contextMenuForListParent(parent as ListParentData);
    }
    return [];
}

function contextMenuForCompoundParent(parent: CompoundParentData): ContextMenuEntry[] {
    return [
        {
            name: "Rename",
            handler: () => {
                Dialog.prompt("Rename Key", "", "Rename", parent.key, (result) => {
                    parent.parent.renameKey(parent.key, result);
                    parent.reRenderUi();
                });
            }
        },
        {
            name: "Change Type",
            handler: () => {
                (async () => {
                    const tagId = await chooseType("Change Type", "Choose the type of the tag. Keep in mind that this will delete all existing data in the tag.");
                    if (tagId != null) {
                        parent.parent.replace(parent.key, getTagFromId(tagId));
                        parent.reRenderUi();
                    }
                })().catch(unexpectedErrorHandler("Failed to choose NBT tag type"));
            }
        },
        {
            name: "Delete",
            handler: () => {
                parent.parent.remove(parent.key);
                parent.reRenderUi();
            }
        }
    ];
}

function contextMenuForListParent(parent: ListParentData): ContextMenuEntry[] {
    const list = [];
    if (parent.index > 0) {
        list.push({
            name: "Move Up",
            handler: () => {
                parent.parent.move(parent.index, parent.index - 1);
                parent.reRenderUi();
            }
        });
    }
    if (parent.index < parent.parent.data.length - 1) {
        list.push({
            name: "Move Down",
            handler: () => {
                parent.parent.move(parent.index, parent.index + 1);
                parent.reRenderUi();
            }
        });
    }
    if (parent.parent.data.length > 1) {
        list.push({
            name: "Change Index",
            handler: () => {
                Dialog.prompt("Change Index", "0 = first, " + (parent.parent.data.length - 1) + " = last", "Change", parent.index.toString(), (result) => {
                    let newIndex = parseInt(result);
                    if (newIndex < 0) {
                        newIndex = 0;
                    } else if (newIndex >= parent.parent.data.length) {
                        newIndex = parent.parent.data.length - 1;
                    }
                    parent.parent.move(parent.index, newIndex);
                    parent.reRenderUi();
                });
            }
        });
    }
    list.push({
        name: "Delete",
        handler: () => {
            parent.parent.remove(parent.index);
            parent.reRenderUi();
        }
    });
    return list;
}

async function chooseType(title: string, text: string, includeEnd: boolean = false): Promise<number | null> {
    const result = await Dialog.choose(title, text, [
        { id: "1", name: "Byte" },
        { id: "2", name: "Short" },
        { id: "3", name: "Int" },
        { id: "4", name: "Long" },
        { id: "5", name: "Float" },
        { id: "6", name: "Double" },
        { id: "8", name: "String" },
        { id: "10", name: "Compound" },
        { id: "9", name: "List" },
        { id: "7", name: "ByteArray" },
        { id: "11", name: "IntArray" },
        { id: "12", name: "LongArray" },
        ...(includeEnd ? [{ id: "13", name: "End" }] : [])
    ]);
    const id = parseInt(result);
    if (id >= 0 && id <= 12) {
        return id;
    }
    return null;
}

function getListTypeName(id: number): string {
    switch (id) {
        case 0: return "End";
        case 1: return "Byte";
        case 2: return "Short";
        case 3: return "Int";
        case 4: return "Long";
        case 5: return "Float";
        case 6: return "Double";
        case 7: return "ByteArray";
        case 8: return "String";
        case 9: return "List";
        case 10: return "Compound";
        case 11: return "IntArray";
        case 12: return "LongArray";
        default: return "Unknown";
    }
}

export function contextMenuForString(tag: NbtString, parent: ParentData, reRenderUi: () => void): ContextMenuPopulator {
    return {
        getEntries: () => [
            {
                name: "Edit",
                handler: () => {
                    Dialog.prompt("Edit NBT String", "", "Edit", tag.value, (result) => {
                        tag.value = result;
                        reRenderUi();
                    });
                }
            },
            {
                name: "Copy String to Clipboard",
                handler: () => {
                    copyToClipboard(tag.value);
                }
            },
            ...contextMenuForParent(parent)
        ]
    };
}

function parseClampedInt(str: string): number {
    const value = parseInt(str);
    return value < -2147483648 ? -2147483648 : value > 2147483647 ? 2147483647 : value;
}

function parseClampedLong(str: string): bigint {
    const value = BigInt(str);
    return value < BigInt("-9223372036854775808") ? BigInt("-9223372036854775808") : value > BigInt("9223372036854775807") ? BigInt("9223372036854775807") : value;
}

function parseClampedByte(str: string): number {
    const value = parseInt(str);
    return value < -128 ? -128 : value > 127 ? 127 : value;
}

function parseClampedShort(str: string): number {
    const value = parseInt(str);
    return value < -32768 ? -32768 : value > 32767 ? 32767 : value;
}

export function contextMenuForNumber(tag: NumberNbtTag, parent: ParentData, reRenderUi: () => void): ContextMenuPopulator {
    return {
        getEntries: () => [
            {
                name: "Edit",
                handler: () => {
                    Dialog.prompt("Edit NBT Number", "", "Edit", tag.toString(), (result) => {
                        if (tag instanceof NbtInt) {
                            tag.value = parseClampedInt(result);
                        } else if (tag instanceof NbtByte) {
                            tag.value = parseClampedByte(result);
                        } else if (tag instanceof NbtShort) {
                            tag.value = parseClampedShort(result);
                        } else if (tag instanceof NbtLong) {
                            tag.value = parseClampedLong(result);
                        } else if (tag instanceof NbtFloat) {
                            tag.value = parseFloat(result);
                        } else if (tag instanceof NbtDouble) {
                            tag.value = parseFloat(result);
                        }
                        reRenderUi();
                    });
                }
            },
            ...contextMenuForParent(parent)
        ]
    };
}

export function contextMenuForArray(tag: ArrayNbtTag, parent: ParentData, reRenderUi: () => void): ContextMenuPopulator {
    return {
        getEntries: () => [
            {
                name: "Edit",
                handler: () => {
                    const defaultText = tag.toSNBT();
                    const typeChar = defaultText.charAt(1);
                    Dialog.prompt("Edit NBT Array", "", "Edit", defaultText, (result) => {
                        if (!result.startsWith(`[${typeChar};`) || !result.endsWith("]")) {
                            Dialog.message("Error", "Invalid format. Please enter a valid NBT array.");
                            return;
                        }
                        const elements = result.slice(2, -1).split(",");
                        if (tag instanceof NbtByteArray) {
                            tag.data = new Int8Array(elements.length);
                            for (let i = 0; i < elements.length; i++) {
                                tag.data[i] = parseClampedByte(elements[i].trim());
                            }
                        } else if (tag instanceof NbtIntArray) {
                            tag.data = new Int32Array(elements.length);
                            for (let i = 0; i < elements.length; i++) {
                                tag.data[i] = parseClampedInt(elements[i].trim());
                            }
                        } else if (tag instanceof NbtLongArray) {
                            tag.data = new BigInt64Array(elements.length);
                            for (let i = 0; i < elements.length; i++) {
                                tag.data[i] = parseClampedLong(elements[i].trim());
                            }
                        }
                        reRenderUi();
                    });
                }
            },
            {
                name: "Copy Array to Clipboard as SNBT",
                handler: () => {
                    copyToClipboard(tag.toSNBT());
                }
            },
            ...contextMenuForParent(parent)
        ]
    };
}

export function contextMenuForCompound(tag: NbtCompound, parent: ParentData, reRenderUi: () => void): ContextMenuPopulator {
    return {
        getEntries: () => [
            {
                name: "Add",
                handler: () => {
                    Dialog.prompt("Add Tag", "Enter the name of the tag.", "Done", "", (name) => {
                        (async () => {
                            if (!name) {
                                return;
                            }
                            if (tag.get(name) !== null) {
                                Dialog.message("Error", "A tag with this name already exists. Please delete the existing tag first or choose a different name.");
                                return;
                            }
                            const tagId = await chooseType("Choose Type", "Choose the type of the tag.");
                            if (!tagId) {
                                return;
                            }
                            tag.add(name, getTagFromId(tagId));
                            reRenderUi();
                        })().catch(unexpectedErrorHandler("Failed to choose tag"));
                    });
                }
            },
            ...contextMenuForParent(parent)
        ]
    };
}

export function contextMenuForList(tag: NbtList, parent: ParentData, reRenderUi: () => void): ContextMenuPopulator {
    return {
        getEntries: () => [
            {
                name: "Change type of elements in list",
                handler: () => {
                    (async () => {
                        const tagId = await chooseType("Change Type", "Choose the type of the tag. Current type is: " + getListTypeName(tag.listTypeId) + (tag.data.length > 0 ? ". Keep in mind that this will delete all existing data and empty the list." : ""), true);
                        if (tagId != null) {
                            tag.changeListType(tagId);
                            reRenderUi();
                        }
                    })().catch(unexpectedErrorHandler("Failed to choose tag type"));
                }
            },
            {
                name: "Add",
                handler: () => {
                    (async () => {
                        if (tag.listTypeId === 0) {
                            const tagId = await chooseType("Choose Type", "Choose the type of the elements in the list.");
                            if (!tagId) {
                                return;
                            }
                            tag.changeListType(tagId);
                        }
                        tag.add(getTagFromId(tag.listTypeId));
                        reRenderUi();
                    })().catch(unexpectedErrorHandler("Failed to choose tag type"));
                }
            },
            ...contextMenuForParent(parent)
        ]
    };
}
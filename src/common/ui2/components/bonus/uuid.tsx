import React from "react";
import FolderEntry from "../../../folder/FolderEntry";
import FTPSession from "../../../ftp/FTPSession";
import { performWithRetry } from "../../../task/taskActions";
import { parentdir } from "../../../utils";
import TextInput from "../elements/TextInput";
import Button from "../elements/Button";
import { usePath } from "../../store/pathStore";
import { useSession } from "../../store/sessionStore";
import { useSelection } from "../../store/selectionStore";

export type UserCacheEntry = {
    name: string;
    uuid: string;
};

const UUID_FILE_NAME_REGEX = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}\..+$/;

export function onlyUuidFileNames(files: FolderEntry[]): boolean {
    return files.every((file) => UUID_FILE_NAME_REGEX.test(file.name));
}

export async function getUserCache(
    session: FTPSession,
    currentPath: string,
): Promise<UserCacheEntry[] | null> {
    // The usercache.json is stored in the server root. Folders with only UUID file
    // names are likely the playerdata folders in worlds. So going up 2 or 3 levels
    // from the current path should be enough to find the usercache.json file.
    //     /world/playerdata/ (go up 2 levels)
    //     /world/players/data (new layout, so go up 3 levels)
    const candidateDirectories = new Set([
        "/",
        parentdir(parentdir(currentPath)),
        parentdir(parentdir(parentdir(currentPath))),
    ]);

    return await new Promise((resolve, reject) => {
        performWithRetry(session, currentPath, async (connection) => {
            for (const dir of candidateDirectories) {
                try {
                    const files = await connection.list(dir);
                    const file = files.find(
                        (file) => file.name === "usercache.json",
                    );
                    if (!file || file.size > 10 * 1024 * 1024) {
                        // Not found. Or a JSON file larger than 10 MB ?? Skip it.
                        return;
                    }
                    const blob = await connection.download(file);
                    const entries = await parseUserCache(blob);
                    resolve(entries);
                    return;
                } catch (err) {
                    // Ignore. This is just a bonus feature anyways.
                }
            }
            resolve(null);
            return;
        }).catch(() => resolve(null));
    });
}

async function parseUserCache(userCacheBlob: Blob): Promise<UserCacheEntry[]> {
    return JSON.parse(await userCacheBlob.text())
        .filter(
            (entry: any) =>
                typeof entry.name === "string" &&
                typeof entry.uuid === "string",
        )
        .map((entry: any) => ({ name: entry.name, uuid: entry.uuid }));
}

export function getRelevantUserCacheEntries(
    entries: UserCacheEntry[] | null,
    files: FolderEntry[],
): UserCacheEntry[] | null {
    if (entries === null) {
        return null;
    }
    const relevantEntries: UserCacheEntry[] = [];
    const mapping = new Map<FolderEntry, UserCacheEntry>();

    for (const entry of entries) {
        const matchingFile = files.filter((file) =>
            file.name.startsWith(entry.uuid),
        );
        if (matchingFile.length > 0) {
            relevantEntries.push(entry);
            matchingFile.forEach((file) => mapping.set(file, entry));
        }
    }

    const missing = new Set<FolderEntry>();
    for (const file of files) {
        if (!mapping.has(file)) {
            missing.add(file);
        }
    }

    // If any files don't have a matching entry, it means we can't show all files in
    // the UUID lookup. This could be confusing, so we just disable the feature in
    // this case.
    if (missing.size > 0) {
        const missingStr = Array.from(missing)
            .map((f) => f.name)
            .join(", ");
        console.log(
            `Unable to use UUID search because the following files are missing: ${missingStr}`,
        );
        return null;
    }

    return relevantEntries;
}

export const UuidLookupComponent: React.FC<{ entries: UserCacheEntry[] }> = ({
    entries,
}) => {
    const [query, setQuery] = React.useState("");

    const results = React.useMemo(() => {
        if (query.trim() === "") {
            return [];
        }
        const lowerQuery = query.toLowerCase();
        return entries
            .filter(
                (entry) =>
                    entry.name.toLowerCase().includes(lowerQuery) ||
                    entry.uuid.toLowerCase().includes(lowerQuery),
            )
            .slice(0, 3); // Limit to 3 results
    }, [query, entries]);

    return (
        <div className="d-flex bg-base-ui2 m-2 p-2 rounded border border-primary">
            <div>
                <div
                    className="bg-highlight-ui2 m-2 me-3 rounded d-flex align-items-center justify-content-center"
                    style={{ width: "35px", height: "35px" }}
                >
                    <i className="bi bi-person"></i>
                </div>
            </div>
            <div>
                <div className="my-2" style={{ height: "35px" }}>
                    <h3 className="m-0 text-small">Player UUID Lookup</h3>
                    <span className="text-smaller text-muted-color">
                        Search for player usernames to find their UUID and
                        corresponding file
                    </span>
                </div>
                <div>
                    <TextInput
                        placeholder="Search by username..."
                        value={query}
                        onChange={setQuery}
                    />
                </div>
                <div>
                    {results.map((entry) => (
                        <UserRow key={entry.name + entry.uuid} entry={entry} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const UserRow: React.FC<{ entry: UserCacheEntry }> = ({ entry }) => {
    function copyToClipboard() {
        navigator.clipboard.writeText(entry.uuid).catch(() => {});
    }

    function findFile() {
        const path = usePath.getState().path;
        const session = useSession.getState().session;
        if (!session) {
            return;
        }
        const entries = session.folderCache.get(path);
        if (!entries) {
            return;
        }
        const matching = entries.filter((folderEntry) =>
            folderEntry.name.startsWith(entry.uuid),
        );
        if (matching.length === 0) {
            return;
        }
        const selectionStore = useSelection.getState();
        selectionStore.setSelection(matching);
        selectionStore.focus(matching[0]);
    }

    return (
        <div className="d-flex align-items-center gap-2 p-2 m-2 rounded hover-bg-ui2 border">
            <div
                className="bg-highlight-ui2 rounded d-flex align-items-center justify-content-center"
                style={{ width: "30px", height: "30px" }}
            >
                <i className="bi bi-person"></i>
            </div>
            <div>
                <div>{entry.name}</div>
                <div className="text-smaller text-muted-color">
                    {entry.uuid}
                </div>
            </div>
            <div className="ms-auto">
                <Button
                    variant="ghost"
                    size="small"
                    icon="copy"
                    label="Copy"
                    onClick={copyToClipboard}
                />
                <Button size="small" label="Find File" onClick={findFile} />
            </div>
        </div>
    );
};

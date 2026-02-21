import React, { useEffect, useMemo, useState } from "react";
import { usePath } from "../../store/pathStore";
import { useFolderContent } from "../../../ftp/FolderCache";
import { useSession } from "../../store/sessionStore";
import {
    getRelevantUserCacheEntries,
    getUserCache,
    onlyUuidFileNames,
    UserCacheEntry,
    UuidLookupComponent,
} from "./uuid";

const BonusActions: React.FC = () => {
    const session = useSession().getSession();
    const path = usePath().path;
    const files = useFolderContent(session, path);

    const uuidLookupActive = files && onlyUuidFileNames(files);
    const [uuidLookupEntries, setUuidLookupEntries] = useState<
        UserCacheEntry[] | null
    >(null);
    useEffect(() => {
        if (!uuidLookupActive) {
            setUuidLookupEntries(null);
            return;
        }
        let active = true;
        getUserCache(session, path)
            .then((entries) => {
                if (active) {
                    const relevant = getRelevantUserCacheEntries(
                        entries,
                        files,
                    );
                    setUuidLookupEntries(relevant);
                }
            })
            .catch(() => {
                // Should never reject. It returns null on failure.
            });
        return () => {
            active = false;
        };
    }, [session, path, uuidLookupActive]);

    if (uuidLookupActive && uuidLookupEntries !== null) {
        return <UuidLookupComponent entries={uuidLookupEntries} />;
    }
    return null;
};

export default BonusActions;

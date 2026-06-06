import React, { useRef } from "react";
import { useSession } from "@common/ui/store/sessionStore";
import FolderContent from "@common/ui/components/main/FolderContent";
import Path from "@common/ui/components/main/Path";
import "./mainView.css";
import Button from "@common/ui/components/elements/Button";
import { usePath } from "@common/ui/store/pathStore";
import { parentdir } from "@common/util/utils";
import Actions from "@common/ui/components/main/Actions";
import FolderExplorer from "@common/ui/components/main/FolderExplorer";
import Ad from "@common/ui/components/elements/Ad";
import { getConfig } from "@common/config/config";
import BonusActions from "@common/ui/components/bonus/BonusActions";
import { handleOnDrop } from "@common/upload/upload";
import { useDragAndDrop } from "@common/ui/DropZone";
import { unexpectedErrorHandler } from "@common/util/error";

const MainView: React.FC = () => {
    const session = useSession((state) => state.session);
    const path = usePath((state) => state.path);
    const setPath = usePath((state) => state.setPath);

    const adConfig = getConfig().ads;

    const dropZone = useRef<HTMLTableSectionElement>(null);
    const dropZoneElement = useDragAndDrop(dropZone, (e) => {
        handleOnDrop(e).catch(unexpectedErrorHandler("Failed to upload"));
    });

    return (
        <main className="main-view">
            <div className="folder-explorer overflow-y-auto pe-4">
                <FolderExplorer />
            </div>
            <div className="actions p-2 m-2 rounded">
                <Actions />
            </div>
            <div className="navigation d-flex flex-row align-items-center gap-2 m-2 rounded">
                <Button
                    icon="house"
                    severity="bg-base"
                    onClick={() => setPath("/")}
                />
                <Button
                    icon="arrow-left"
                    severity="bg-base"
                    onClick={() => setPath(parentdir(path))}
                />
                <Button
                    icon="arrow-clockwise"
                    severity="bg-base"
                    onClick={() =>
                        session?.folderCache.clearAndFetch(session, path)
                    }
                />
                <div className="path-container flex-grow-1 rounded">
                    <Path />
                </div>
            </div>
            <div
                ref={dropZone}
                className="content flex-grow-1 overflow-y-auto m-2 rounded"
            >
                <BonusActions />
                <FolderContent />
                {dropZoneElement}
            </div>
            <small
                id="version"
                className="text-secondary position-absolute bottom-0 end-0 p-2"
            >
                <span>{`Version: ${import.meta.env.VERSION}`}</span>
            </small>
            {adConfig.enabled && adConfig.slots.rightAd && (
                <div className="right-content align-items-center">
                    <Ad
                        name="right-ad"
                        sizes={[
                            [160, 600],
                            [120, 600],
                        ]}
                    />
                </div>
            )}
            {adConfig.enabled && adConfig.slots.bottomAd && (
                <div
                    className={`bottom-content bottomAdDesktop-${adConfig.slots.bottomAdDesktop}`}
                >
                    <Ad
                        name="bottom-ad"
                        sizes={[
                            [300, 50],
                            [728, 90],
                            [468, 60],
                        ]}
                    />
                </div>
            )}
        </main>
    );
};

export default MainView;

import React from "react";
import { useSession } from "../store/sessionStore";
import FolderContent from "../components/main/FolderContent";
import Path from "../components/main/Path";
import "./mainView.css";
import Button from "../components/elements/Button";
import { usePath } from "../store/pathStore";
import { parentdir } from "../../utils";
import Actions from "../components/main/Actions";
import FolderExplorer from "../components/main/FolderExplorer";

const MainView: React.FC = () => {
    const session = useSession((state) => state.session);
    const path = usePath((state) => state.path);
    const setPath = usePath((state) => state.setPath);

    return (
        <main className="main-view d-flex flex-row flex-grow-1">
            <div className="folder-explorer overflow-y-auto pe-4">
                <FolderExplorer />
            </div>
            <div className="main-view-right d-flex flex-column flex-grow-1">
                <div className="actions py-2">
                    <Actions />
                </div>
                <div className="navigation d-flex flex-row align-items-center gap-2 px-2 py-3">
                    <Button icon="house" onClick={() => setPath("/")} />
                    <Button
                        icon="arrow-left"
                        onClick={() => setPath(parentdir(path))}
                    />
                    <Button
                        icon="arrow-clockwise"
                        onClick={() =>
                            session?.folderCache.clearAndFetch(session, path)
                        }
                    />
                    <div className="path-container flex-grow-1">
                        <Path />
                    </div>
                </div>
                <div className="content flex-grow-1 overflow-y-auto">
                    <FolderContent />
                </div>
            </div>
        </main>
    );
};

export default MainView;

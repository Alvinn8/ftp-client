import React from "react";
import { useSession } from "../store/sessionStore";
import FolderContent from "../components/main/FolderContent";
import Path from "../components/main/Path";

const MainView: React.FC = () => {
    const session = useSession((state) => state.session);

    return (
        <div>
            <Path />
            <FolderContent />
        </div>
    );
};

export default MainView;

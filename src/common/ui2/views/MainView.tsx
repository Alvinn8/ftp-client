import React from "react";
import { useSession } from "../store/sessionStore";

const MainView: React.FC = () => {
    const session = useSession((state) => state.session);

    return (
        <div>
            <h2>Main View</h2>
        </div>
    );
};

export default MainView;

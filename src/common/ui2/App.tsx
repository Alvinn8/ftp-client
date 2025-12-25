import React from "react";
import MainView from "./views/MainView";
import "./colors.css";
import { useSession } from "./store/sessionStore";
import LoginView from "./views/LoginView";
import Tasks from "../ui/task/Tasks";
import LargeFileOperation from "../ui/LargeFileOperation";
import OpenEditors from "../ui/editor/OpenEditors";
import Messages from "../ui/messages";

const App: React.FC = () => {
    const hasSession = useSession((state) => state.hasSession());

    return (
        <div>
            <div
                style={{
                    backgroundColor: "hsl(350, 80%, 15%)",
                    color: "white",
                    padding: "8px",
                    textAlign: "center",
                }}
            >
                <strong>Note:</strong> The new UI is still experimental. Some
                features may not work as intended. Please report all bugs!
            </div>
            {hasSession ? <MainView /> : <LoginView />}
            <div
                className="position-absolute bottom-0 end-0 p-3 d-flex flex-column"
                style={{ gap: "8px" }}
            >
                <LargeFileOperation />
                <Tasks />
                <OpenEditors />
            </div>
            <Messages />
        </div>
    );
};

export default App;

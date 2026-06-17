import React from "react";
import MainView from "./views/MainView";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./style.css";
import "./colors.css";
import "./scrollbars.css";
import { useSession } from "./store/sessionStore";
import LoginView from "./views/LoginView";
import Tasks from "./task/Tasks";
import LargeFileOperation from "./LargeFileOperation";
import OpenEditors from "./editor/OpenEditors";
import Messages from "./messages";
import ConnectionIssueScreen from "./ConnectionIssueScreen";

const App: React.FC = () => {
    const hasSession = useSession((state) => state.hasSession());

    return (
        <div className="d-flex flex-column overflow-hidden">
            <div
                className="flex-grow-1 d-flex flex-column overflow-hidden"
                style={{ minHeight: 0 }}
            >
                {hasSession ? <MainView /> : <LoginView />}
            </div>
            <div
                className="position-absolute bottom-0 end-0 p-3 d-flex flex-column bottom-toast"
                style={{ gap: "8px" }}
            >
                <LargeFileOperation />
                <Tasks />
                <OpenEditors />
            </div>
            <Messages />
            <ConnectionIssueScreen />
        </div>
    );
};

export default App;

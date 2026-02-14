import React from "react";
import MainView from "./views/MainView";
import "./colors.css";
import "./scrollbars.css";
import { useSession } from "./store/sessionStore";
import LoginView from "./views/LoginView";
import Tasks from "../ui/task/Tasks";
import LargeFileOperation from "../ui/LargeFileOperation";
import OpenEditors from "../ui/editor/OpenEditors";
import Messages from "../ui/messages";

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
        </div>
    );
};

export default App;

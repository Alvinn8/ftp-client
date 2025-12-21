import React from "react";
import MainView from "./views/MainView";
import "./colors.css";
import { useSession } from "./store/sessionStore";
import LoginView from "./views/LoginView";
import Messages from "../ui/messages";
import Tasks from "../ui/task/Tasks";

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
                <strong>Note:</strong> The new UI is still in development. Some
                features may be missing or incomplete.
            </div>
            {hasSession ? <MainView /> : <LoginView />}
            <Messages />
            <Tasks />
        </div>
    );
};

export default App;

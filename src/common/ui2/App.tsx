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
            {hasSession ? <MainView /> : <LoginView />}
            <Messages />
            <Tasks />
        </div>
    );
};

export default App;

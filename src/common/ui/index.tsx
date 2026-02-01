import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./googleTranslateFix";
import { App } from "./App";
import Ui2App from "../ui2/App";
import { useNewUiStore } from "../ui2/store/newUiStore";
import { useEffect, useState } from "react";
import { loadConfig, onLoad, removeOnLoad } from "../config/config";
import { unexpectedErrorHandler } from "../error";
import ConnectingScreen from "./ConnectingScreen";

loadConfig().catch(unexpectedErrorHandler("Config Load Error"));

const AppWrapper: React.FC = () => {
    const [ready, setReady] = useState(false);
    const useNewUi = useNewUiStore((state) => state.useNewUi);

    useEffect(() => {
        const onConfigLoad = () => setReady(true);
        onLoad(onConfigLoad);
        return () => {
            removeOnLoad(onConfigLoad);
        };
    }, []);

    if (!ready) {
        return <ConnectingScreen title={"Connecting..."} body={"Connecting..."} />;
    }

    if (useNewUi) {
        return <Ui2App />;
    }
    return <App />;
};

ReactDOM.createRoot(document.getElementById("root")).render(<AppWrapper />);

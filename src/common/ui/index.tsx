import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./googleTranslateFix";
import Ui2App from "./App";
import { useEffect, useState } from "react";
import { loadConfig, onLoad, removeOnLoad } from "../config/config";
import { unexpectedErrorHandler } from "../util/error";
import ConnectingScreen from "./ConnectingScreen";

loadConfig().catch(unexpectedErrorHandler("Config Load Error"));

const AppWrapper: React.FC = () => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const onConfigLoad = () => setReady(true);
        onLoad(onConfigLoad);
        return () => {
            removeOnLoad(onConfigLoad);
        };
    }, []);

    if (!ready) {
        return (
            <ConnectingScreen title={"Connecting..."} body={"Connecting..."} />
        );
    }

    return <Ui2App />;
};

ReactDOM.createRoot(document.getElementById("root")).render(<AppWrapper />);

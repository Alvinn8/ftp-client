import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { App } from "./App";
import Ui2App from "../ui2/App";

const AppWrapper: React.FC = () => {
    const [useNewUi, setUseNewUi] = React.useState(true);

    if (useNewUi) {
        return <Ui2App />;
    }
    return <App />;
};

ReactDOM.createRoot(document.getElementById("root")).render(<AppWrapper />);

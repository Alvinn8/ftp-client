import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { App } from "./App";
import Ui2App from "../ui2/App";
import { useNewUiStore } from "../ui2/store/newUiStore";

const AppWrapper: React.FC = () => {
    const useNewUi = useNewUiStore((state) => state.useNewUi);

    if (useNewUi) {
        return <Ui2App />;
    }
    return <App />;
};

ReactDOM.createRoot(document.getElementById("root")).render(<AppWrapper />);

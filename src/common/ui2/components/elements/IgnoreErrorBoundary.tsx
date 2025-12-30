import * as React from "react";
import { ErrorInfo } from "react";
import { formatError } from "../../../error";

export type Props = {
    fallback: JSX.Element;
    children: JSX.Element;
};
type State = {
    hasError: boolean;
};

/**
 * An error boundry that ignores errors.
 */
export default class IgnoreErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.log(
            "Ignoring error in error boundry",
            formatError(error),
            errorInfo.componentStack,
        );
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }

        return this.props.children;
    }
}

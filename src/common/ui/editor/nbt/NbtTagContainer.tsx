import * as React from "react";
import { createContextMenu, removeContextMenu } from "../../ContextMenu";
import ContextMenuPopulator from "../../../contextmenu/ContextMenuPopulator";
interface Props {
    label: React.ReactNode | null;
    populator?: ContextMenuPopulator;
}

interface State {
}

export default class NbtTagContainer extends React.Component<Props, State> {
    state = {
        selected: false
    }

    render() {
        const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            removeContextMenu();
            createContextMenu(this.props.populator || { getEntries: () => [] }, e.clientX, e.clientY);
        };

        return (
            <div
                className={"tag-container"}
                onClick={handleClick}
                onContextMenu={handleClick}
            >
                {this.props.label != null && (
                    <span>{this.props.label}: </span>
                )}
                {this.props.children}
            </div>
        );
    }
}
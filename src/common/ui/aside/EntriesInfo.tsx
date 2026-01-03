import * as React from "react";
import FolderEntry from "../../folder/FolderEntry";
import Size from "../Size";
import CompuseSize from "./ComputeSize";

interface EntriesInfoProps {
    selection: FolderEntry[];
}

/**
 * Information about multiple selected folder entries.
 */
export default class EntriesInfo extends React.Component<EntriesInfoProps, {}> {
    render() {
        let size = 0;
        for (const entry of this.props.selection) {
            if (!entry.isFile()) {
                size = null;
                break;
            }
            size += entry.size;
        }
        return (
            <div>
                <p>{ this.props.selection.length } selected entries.</p>
                { size != null && (
                    <p><span>Combined size: </span><Size size={size} /></p>
                )}
                {size == null && (
                    <CompuseSize selection={this.props.selection} key={Math.random()} />
                )}
            </div>
        );
    }
}
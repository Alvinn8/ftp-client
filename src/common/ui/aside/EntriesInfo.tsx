import * as React from "react";
import { selectedFiles } from "../../selection/selection";
import Size from "../Size";
import CompuseSize from "./ComputeSize";

/**
 * Information about multiple selected folder entries.
 */
export default class EntriesInfo extends React.Component {
    render() {
        let size = 0;
        for (const entry of selectedFiles) {
            if (!entry.isFile()) {
                size = null;
                break;
            }
            size += entry.size;
        }
        return (
            <div>
                <p>{ selectedFiles.length } selected entries.</p>
                { size != null && (
                    <p>Combined size: <Size size={size} /></p>
                )}
                {size == null && (
                    <CompuseSize key={Math.random()} />
                )}
            </div>
        );
    }
}
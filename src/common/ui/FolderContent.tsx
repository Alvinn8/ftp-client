import * as React from "react";
import FolderContentProvider from "../folder/FolderContentProvider";
import FolderEntry from "../folder/FolderEntry";
import { handleOnDrop } from "../upload/upload";
import DropZone from "./DropZone";
import FolderEntryComponent from "./FolderEntryComponent";
import { app } from "./index";

interface FolderContentProps {
    provider: FolderContentProvider;
}

interface FolderContentState {
    entries: FolderEntry[] | null;
    dragAndDrop: boolean;
}

/**
 * A component that renderes the files and folders in the current directory.
 */
export default class FolderContent extends React.Component<FolderContentProps, FolderContentState> {
    private readonly ref: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props) {
        super(props);

        app.folderContent = this;

        this.state = {
            entries: null,
            dragAndDrop: false
        };
    }

    async componentDidMount() {
        await this.getEntries();

        this.ref.current.ondragenter = this.onDragEnter.bind(this);
        this.ref.current.ondragleave = this.onDragLeave.bind(this);
        this.ref.current.ondrop = () => {};
        // noop event listener, we just need to listen for ondrop
        // to make the element a valid drag and drop target.
    }

    async getEntries() {
        this.setState({
            entries: await this.props.provider.getFolderEntries()
        });
    }

    onDragEnter(e: DragEvent) {
        e.preventDefault();
        this.setState({
            dragAndDrop: true
        });
    }

    onDragLeave(e: DragEvent) {
        const box = this.ref.current.getBoundingClientRect();
        const scrollTop = this.ref.current.parentElement.scrollTop;
        if (e.clientX > box.right
            || e.clientX < box.x
            || e.clientY > box.bottom + scrollTop
            || e.clientY < box.y + scrollTop) {
            this.setState({
                dragAndDrop: false
            });
        }
    }

    onDrop(e: DragEvent) {
        // Read and upload
        handleOnDrop(e);

        this.setState({
            dragAndDrop: false
        });
    }
    
    render() {
        let dropZone;
        if (this.state.dragAndDrop) {
            const box = this.ref.current.getBoundingClientRect();
            const scrollTop = this.ref.current.parentElement.scrollTop;
            dropZone = <DropZone
                x={box.x}
                y={box.y + scrollTop}
                width={box.width}
                height={box.height}
                onDrop={this.onDrop.bind(this)}
            />;
        }
        return (
            <div className="py-3" ref={this.ref}>
                {this.state.entries == null && <p>Loading files...</p> }
                {this.state.entries != null &&
                    this.state.entries.map((value, index) => {
                        return <FolderEntryComponent entry={value} key={value.name} />;
                    })
                }
                {dropZone}
            </div>
        );
    }
}
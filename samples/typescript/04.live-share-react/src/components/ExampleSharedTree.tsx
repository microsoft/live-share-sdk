import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
import { TreeViewConfiguration } from "fluid-framework";
import { FC, memo } from "react";
import { Note, Notes } from "./ExampleSharedTree-schema";
import { Button, Textarea } from "@fluentui/react-components";

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration(
    // Schema for the root
    { schema: Notes }
);

const initialData = new Notes([]);

export const EXAMPLE_SHARED_TREE_KEY = "MY-TREE";

export const ExampleSharedTree: FC = () => {
    const { root } = useSharedTree(
        EXAMPLE_SHARED_TREE_KEY,
        appTreeConfiguration,
        initialData
    );
    const { node: notes } = useTreeNode(root);

    if (!root) {
        return <>Loading root...</>;
    }
    if (!notes) {
        return <>Loading notes...</>;
    }
    return (
        <div>
            <div className="flex row" style={{ padding: "12px 12px" }}>
                <h2>{"Notes"}</h2>
                <button
                    onClick={() => {
                        notes.addNode("Me");
                    }}
                >
                    {"+ Add note"}
                </button>
            </div>
            <div className="flex wrap row hAlign">
                {notes.map((note) => (
                    <MemoNoteSticky key={note.id} note={note} />
                ))}
            </div>
        </div>
    );
};

interface IExampleNoteStickyProps {
    note: Note;
}

const ExampleNoteSticky: FC<IExampleNoteStickyProps> = ({ note }) => {
    const { node: noteNode } = useTreeNode(note, "treeChanged");
    return (
        <div
            style={{
                width: "200px",
                height: "200px",
                border: "1px solid gray",
                borderRadius: "4px",
                backgroundColor: "#FFFCB9",
                padding: "8px",
            }}
        >
            {`${noteNode.author} | ${noteNode.votes.length} votes`}
            <Textarea
                value={noteNode.text}
                onChange={(ev, data) => {
                    noteNode.text = data.value;
                }}
                style={{
                    marginBottom: "12px",
                }}
            />
            <button
                onClick={() => {
                    note.toggleVote("Me");
                }}
            >
                Vote
            </button>
        </div>
    );
};
const MemoNoteSticky = memo(ExampleNoteSticky);

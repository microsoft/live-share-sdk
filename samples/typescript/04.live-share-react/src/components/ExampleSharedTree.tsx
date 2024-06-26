import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
import { TreeViewConfiguration } from "fluid-framework";
import { FC, memo } from "react";
import { Note, Notes } from "./ExampleSharedTree-schema";
import { Textarea } from "@fluentui/react-components";

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
            <div className="flex row sticky-actions">
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
                    <MemoNoteSticky key={note.id} noteNode={note} />
                ))}
            </div>
        </div>
    );
};

interface INoteStickyProps {
    noteNode: Note;
}

const NoteSticky: FC<INoteStickyProps> = ({ noteNode }) => {
    const { node: note } = useTreeNode(noteNode, "treeChanged");
    return (
        <div className="sticky-note">
            {`${note.author} | ${note.votes.length} votes`}
            <Textarea
                value={note.text}
                className="sticky-textarea"
                onChange={(_, data) => {
                    note.text = data.value;
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
const MemoNoteSticky = memo(NoteSticky);

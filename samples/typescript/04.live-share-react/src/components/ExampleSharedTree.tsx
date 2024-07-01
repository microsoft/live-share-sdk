import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
import { TreeViewConfiguration } from "fluid-framework";
import { FC, memo, useCallback, ChangeEvent } from "react";
import { Note, NoteHeader, Notes } from "./ExampleSharedTree-schema";
import { Textarea, TextareaOnChangeData } from "@fluentui/react-components";

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
    // This helps us test passing our proxy node into useTreeNode
    // Shouldn't be used in production
    const { node: testSelfReferenceNode } = useTreeNode(root);
    const { node: notes } = useTreeNode(testSelfReferenceNode);

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
    // "treeChanged" behavior currently re-proxies all children nodes
    // shouldn't be used in production in current state
    const { node: note } = useTreeNode(noteNode, "treeChanged");
    const onTextChange = useCallback(
        (_: ChangeEvent, data: TextareaOnChangeData) => {
            note.text = data.value;
        },
        [note]
    );
    return (
        <div className="sticky-note">
            <MemoNoteHeaderView noteHeaderNode={note.header} />
            <div>{`${note.author} | ${note.votes.length} votes`}</div>
            <div className="sticky-textarea-container">
                <Textarea
                    className="sticky-textarea"
                    value={note.text}
                    onChange={onTextChange}
                />
            </div>
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

interface INoteHeaderProps {
    noteHeaderNode: NoteHeader;
}

const NoteHeaderView: FC<INoteHeaderProps> = ({ noteHeaderNode }) => {
    return (
        <div className="flex row vAlign">
            {!noteHeaderNode.color && (
                <button
                    onClick={() => {
                        noteHeaderNode.setRandomVibrantColor();
                    }}
                >
                    {"Add color"}
                </button>
            )}
            {noteHeaderNode.color && (
                <div
                    className="sticky-note-color"
                    onClick={() => {
                        noteHeaderNode.setRandomVibrantColor();
                    }}
                    style={{
                        backgroundColor: noteHeaderNode?.color,
                    }}
                />
            )}
            {noteHeaderNode.emoji && (
                <div
                    className="cursor-pointer"
                    onClick={() => {
                        noteHeaderNode.setRandomEmoji();
                    }}
                >
                    {noteHeaderNode.emoji}
                </div>
            )}
            {!noteHeaderNode.emoji && (
                <button
                    onClick={() => {
                        noteHeaderNode.setRandomEmoji();
                    }}
                >
                    {"Add emoji"}
                </button>
            )}
        </div>
    );
};
const MemoNoteHeaderView = memo(NoteHeaderView);

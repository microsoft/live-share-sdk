import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
import { FC, memo, useCallback, ChangeEvent } from "react";
import {
    Note,
    NoteHeader,
    Notes,
    appTreeConfiguration,
} from "./ExampleSharedTree-schema";
import { Textarea, TextareaOnChangeData } from "@fluentui/react-components";

const initialData = new Notes([]);

export const EXAMPLE_SHARED_TREE_KEY = "MY-TREE";

export const ExampleSharedTree: FC = () => {
    // Live Share hook that creates a new SharedTree instance dynamically.
    // `root` is of type `Notes`, which is just a list of `Note` nodes.
    const { root } = useSharedTree(
        EXAMPLE_SHARED_TREE_KEY,
        appTreeConfiguration,
        initialData
    );

    // Live Share hook that makes the `root` value stateful.
    // By default, all child nodes of `notes` are not stateful and must be passed into `useTreeNode`.
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
    // Makes the `noteNode` value stateful to React.
    // Here we use the "treeChanged" prop, which will ensure all child nodes are stateful also.
    // Since this note is a pretty small component, it is pretty safe to do this here.
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
    // Since we used "treeChanged" in `NoteSticky`, we don't need to use `useTreeNode` here.
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

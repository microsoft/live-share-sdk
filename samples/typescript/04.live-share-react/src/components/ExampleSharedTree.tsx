import { useSharedTree } from "@microsoft/live-share-react";
import { Tree, TreeViewConfiguration } from "fluid-framework";
import { FC, useEffect, useState } from "react";
import { INote, Note, Notes } from "./ExampleSharedTree-schema";
import { Button, Textarea } from "@fluentui/react-components";

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration(
    // Schema for the root
    { schema: Notes }
);

const initialData = new Notes([]);

export const ExampleSharedTree: FC = () => {
    const { treeView } = useSharedTree<typeof Notes>(
        "my-tree",
        appTreeConfiguration,
        initialData
    );
    const [notes, setNotes] = useState<Note[]>([]);

    useEffect(() => {
        if (!treeView) return;
        const unsubscribe = Tree.on(treeView.root, "nodeChanged", () => {
            setNotes([...treeView.root.values()]);
        });
        return unsubscribe;
    }, [treeView]);

    if (!treeView) {
        return <>Loading notes...</>;
    }
    return (
        <div>
            <div>
                <Button
                    onClick={() => {
                        treeView.root.addNode("Me");
                    }}
                >
                    {"Add note"}
                </Button>
            </div>
            {notes.map((note) => (
                <ExampleNoteSticky key={note.id} note={note} />
            ))}
        </div>
    );
};

interface IExampleNoteStickyProps {
    note: Note;
}

const ExampleNoteSticky: FC<IExampleNoteStickyProps> = ({ note }) => {
    const [noteObj, setObj] = useState<INote>({
        id: note.id,
        text: note.text,
        author: note.author,
        /**
         * Sequence of user ids to track which users have voted on this note.
         */
        votes: note.votes,
        created: note.created,
        lastChanged: note.lastChanged,
    });
    useEffect(() => {
        const unsubscribe = Tree.on(note, "nodeChanged", () => {
            setObj({
                id: note.id,
                text: note.text,
                author: note.author,
                /**
                 * Sequence of user ids to track which users have voted on this note.
                 */
                votes: note.votes,
                created: note.created,
                lastChanged: note.lastChanged,
            });
        });
        return unsubscribe;
    }, [note]);
    return (
        <div>
            <Textarea
                value={noteObj.text}
                onChange={(ev, data) => {
                    note.text = data.value;
                }}
            />
            {noteObj.author}
        </div>
    );
};

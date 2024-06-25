import { useSharedTree, useTreeNode } from "@microsoft/live-share-react";
import { TreeViewConfiguration } from "fluid-framework";
import { FC } from "react";
import { Note, Notes } from "./ExampleSharedTree-schema";
import { Button, Textarea } from "@fluentui/react-components";

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration(
    // Schema for the root
    { schema: Notes }
);

const initialData = new Notes([]);

export const ExampleSharedTree: FC = () => {
    const { treeView } = useSharedTree(
        "my-tree",
        appTreeConfiguration,
        initialData
    );
    const { node: notes } = useTreeNode(treeView?.root);

    if (!notes) {
        return <>Loading notes...</>;
    }
    return (
        <div>
            <div>
                <Button
                    onClick={() => {
                        notes.addNode("Me");
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
    const { node: noteNode } = useTreeNode(note);
    return (
        <div>
            <Textarea
                value={noteNode.text}
                onChange={(ev, data) => {
                    note.text = data.value;
                }}
            />
            {noteNode.author}
        </div>
    );
};

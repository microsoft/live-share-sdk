import {
    NodeKind,
    SchemaFactory,
    Tree,
    TreeArrayNode,
    TreeNodeSchema,
    ValidateRecursiveSchema,
    WithType,
} from "fluid-framework";
import { v4 as uuid } from "uuid";

const sf = new SchemaFactory("fc1db2e8-0000-11ee-be57-0242ac120002");

export interface INote {
    /**
     * Id to make building the React app simpler.
     */
    id: string;
    text: string;
    author: string;
    /**
     * Sequence of user ids to track which users have voted on this note.
     */
    votes: TreeArrayNode<
        TreeNodeSchema<
            "com.fluidframework.leaf.string",
            NodeKind.Leaf,
            string,
            string
        >
    > &
        WithType<`fc1db2e8-0000-11ee-be57-0242ac120002.Array<${string}>`>;
    created: number;
    lastChanged: number;
}

// Define the schema for the note object.
// Helper functions for working with the data contained in this object
// are included in this class definition as methods.
export class Note extends sf.object(
    "Note",
    // Fields for Notes which SharedTree will store and synchronize across clients.
    // These fields are exposed as members of instances of the Note class.
    {
        /**
         * Id to make building the React app simpler.
         */
        id: sf.string,
        text: sf.string,
        author: sf.string,
        /**
         * Sequence of user ids to track which users have voted on this note.
         */
        votes: sf.array(sf.string),
        created: sf.number,
        lastChanged: sf.number,
    }
) {
    // Update the note text and also update the timestamp in the note
    public updateText(text: string) {
        this.lastChanged = new Date().getTime();
        this.text = text;
    }

    public toggleVote(user: string) {
        const index = this.votes.indexOf(user);
        if (index > -1) {
            this.votes.removeAt(index);
        } else {
            this.votes.insertAtEnd(user);
        }

        this.lastChanged = new Date().getTime();
    }

    /**
     * Removes a node from its parent {@link Notes}.
     * If the note is not in an {@link Notes}, it is left unchanged.
     */
    public delete() {
        const parent = Tree.parent(this);
        // Use type narrowing to ensure that parent is Items as expected for a note.
        if (Tree.is(parent, Notes)) {
            const index = parent.indexOf(this);
            parent.removeAt(index);
        }
    }
}

// Schema for a list of Notes and Groups.
export class Notes extends sf.arrayRecursive("Notes", [() => Note]) {
    public addNode(author: string) {
        const timeStamp = new Date().getTime();

        // Define the note to add to the SharedTree - this must conform to
        // the schema definition of a note
        const newNote = new Note({
            id: uuid(),
            text: "",
            author,
            votes: [],
            created: timeStamp,
            lastChanged: timeStamp,
        });

        // Insert the note into the SharedTree.
        this.insertAtEnd(newNote);
    }
}

{
    // Due to limitations of TypeScript, recursive schema may not produce type errors when declared incorrectly.
    // Using ValidateRecursiveSchema helps ensure that mistakes made in the definition of a recursive schema (like `Items`)
    // will introduce a compile error.
    type _check = ValidateRecursiveSchema<typeof Notes>;
}

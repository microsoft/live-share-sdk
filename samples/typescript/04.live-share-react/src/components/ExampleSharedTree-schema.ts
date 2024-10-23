import { SchemaFactory, Tree, TreeViewConfiguration } from "fluid-framework";
import { v4 as uuid } from "uuid";

const sf = new SchemaFactory("fc1db2e8-0000-11ee-be57-0242ac120002");

// Schema for a list of Notes and Groups.
export class NoteComment extends sf.object("NoteComment", {
    id: sf.string,
    author: sf.string,
    votes: sf.array(sf.string),
    text: sf.string,
    created: sf.number,
    lastChanged: sf.number,
}) {
    //
}

export class NoteComments extends sf.array("NoteComments", [
    () => NoteComment,
]) {
    public addNode(author: string) {
        const timeStamp = new Date().getTime();

        // Define the note to add to the SharedTree - this must conform to
        // the schema definition of a note
        const newVote = new NoteComment({
            id: uuid(),
            text: "",
            author,
            votes: [],
            created: timeStamp,
            lastChanged: timeStamp,
        });

        // Insert the note into the SharedTree.
        this.insertAtEnd(newVote);
    }
}

export class NoteHeader extends sf.object("NoteHeader", {
    color: sf.optional(sf.string),
    emoji: sf.optional(sf.string),
}) {
    setRandomVibrantColor() {
        const vibrantColors: string[] = [
            "#FF5733", // Vibrant Red-Orange
            "#FFBD33", // Vibrant Orange
            "#FFD733", // Vibrant Yellow
            "#33FF57", // Vibrant Green
            "#33FFBD", // Vibrant Aqua
            "#33D7FF", // Vibrant Sky Blue
            "#3357FF", // Vibrant Blue
            "#8D33FF", // Vibrant Purple
            "#FF33BD", // Vibrant Pink
            "#FF3357", // Vibrant Red
        ];

        const randomIndex: number = Math.floor(
            Math.random() * vibrantColors.length
        );
        this.color = vibrantColors[randomIndex];
    }
    setRandomEmoji() {
        const vibrantEmojis: string[] = [
            "🌟", // Star
            "🔥", // Fire
            "🌈", // Rainbow
            "🍓", // Strawberry
            "🍊", // Tangerine
            "🍋", // Lemon
            "🍀", // Four Leaf Clover
            "🌸", // Cherry Blossom
            "🎨", // Palette
            "🎉", // Party Popper
        ];

        const randomIndex: number = Math.floor(
            Math.random() * vibrantEmojis.length
        );
        this.emoji = vibrantEmojis[randomIndex];
    }
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
        header: NoteHeader,
        comments: NoteComments,
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

export type INote = typeof Note;

// Schema for a list of Notes and Groups.
export class Notes extends sf.array("Notes", [() => Note]) {
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
            comments: [],
            header: new NoteHeader({
                emoji: undefined,
                color: undefined,
            }),
        });

        // Insert the note into the SharedTree.
        this.insertAtEnd(newNote);
    }
}

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration(
    // Schema for the root
    { schema: Notes }
);

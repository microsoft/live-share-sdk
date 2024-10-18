import { IStroke } from "../Stroke.js";
import { InkingManager } from "../InkingManager.js";

/**
 * @internal
 * Tracks stroke changes in {@link InkingManager}
 */
export class ChangeLog {
    private _addedStrokes: Map<string, IStroke> = new Map<string, IStroke>();
    private _removedStrokes: Set<string> = new Set<string>();

    public clear() {
        this._addedStrokes.clear();
        this._removedStrokes.clear();
    }

    public mergeChanges(changes: ChangeLog) {
        for (let id of changes._removedStrokes) {
            if (!this._addedStrokes.delete(id)) {
                this._removedStrokes.add(id);
            }
        }

        changes._addedStrokes.forEach((value: IStroke) => {
            this._addedStrokes.set(value.id, value);
        });
    }

    public addStroke(stroke: IStroke) {
        this._addedStrokes.set(stroke.id, stroke);
    }

    public removeStroke(id: string) {
        this._removedStrokes.add(id);
    }

    public getRemovedStrokes(): string[] {
        return Array.from(this._removedStrokes);
    }

    public getAddedStrokes(): IStroke[] {
        return Array.from(this._addedStrokes.values());
    }

    get hasChanges(): boolean {
        return this._addedStrokes.size > 0 || this._removedStrokes.size > 0;
    }
}

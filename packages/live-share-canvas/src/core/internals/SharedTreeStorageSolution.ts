import { IStroke } from "../Stroke";
import { LiveCanvasStroke, LiveCanvasTreeNode } from "../LiveCanvasTreeSchema";
import { Tree, TreeStatus } from "fluid-framework";
import { InkingManager } from "../InkingManager";
import { LiveCanvasStorageSolution, StorageSolutionEvents } from ".";

export class SharedTreeStorageSolution extends LiveCanvasStorageSolution {
    private unsubscribeListeners: (() => void)[] = [];
    // Track nodes previously checked so we can figure out which strokes were removed.
    // This is needed because `Tree.on` doesn't include a diff of changes.
    private previousCheckedNodes: Map<string, LiveCanvasStroke> = new Map();
    // Map to track some metadata about strokes we have already rendered.
    // This helps us skip rendering strokes / updates that haven't changed.
    private renderedStrokesMap: Map<
        string,
        {
            timestamp: number;
            status: TreeStatus;
        }
    > = new Map();

    constructor(
        private root: LiveCanvasTreeNode,
        private inkingManager: InkingManager
    ) {
        super();
        // Start listening for changes to the strokes map and its child nodes
        this.setupListeners();
    }

    private setupListeners(checkForChanges: boolean = false) {
        // Unsubscribe to existing listeners
        this.unsubscribeListeners.forEach((unsubscribe) => unsubscribe());

        // Listen for changes to the stroke map
        const unsubscribe = Tree.on(this.root.dryInkMap, "nodeChanged", () => {
            // Fluid currently doesn't expose what keys were added/updated/removed.
            // Thus, we just brute force our way through it and re-listen to everything.
            // This time, we want to emit changes to `LiveCanvas`, so we set `checkForChanges` to true.
            this.setupListeners(true);
        });
        this.unsubscribeListeners = [unsubscribe];

        // If we are checking for changes, we want to first check if the map is empty.
        // If it is and we have currently rendered strokes, we emit a clear event.
        if (checkForChanges) {
            if (this.root.dryInkMap.size === 0) {
                if (this.renderedStrokesMap.size === 0) {
                    // There is no change to what has been rendered.
                    // This includes cases where the local user was the one to clear the strokes.
                    // `InkingManager` optimistically clears stuff before emitting it.
                    // Thus, we can safely skip emitting this back to `LiveCanvas`.
                    return;
                }
                // Clear all rendered strokes, since we are clearing the `InkingManager`.
                this.renderedStrokesMap.clear();

                // Notify `LiveCanvas` that the strokes were cleared.
                // Hardcode to false because the local client should never have initiated this.
                // If they did, it would have been because of undo/redo, merge resolution, or something else.
                // In that case, its fine to treat the change like we do for remote clients.
                this.emit(StorageSolutionEvents.strokesCleared, false);
                return;
            }
        }
        // Track strokes currently in map so we can set into this.previousCheckedNodes after we notify of removed nodes
        const newCheckedNodes: Map<string, LiveCanvasStroke> = new Map();

        // Iterate through each stroke node and listen for changes to them
        this.root.dryInkMap.forEach((value, key) => {
            // We checked this node, any leftovers we will notify that the node was removed
            this.previousCheckedNodes.delete(key);
            newCheckedNodes.set(key, value);
            // Listen for changes to the strokes
            const nodeUnsubscribe = Tree.on(value, "treeChanged", () => {
                // Emit change to `LiveCanvas`
                this.handleNewOrChangedStroke(value, Tree.status(value));
            });
            this.unsubscribeListeners.push(nodeUnsubscribe);

            if (!checkForChanges) return;

            // Check for existing timestamp
            const lastState = this.renderedStrokesMap.get(key);
            const status = Tree.status(value);
            // Check if we have already rendered the change. If so, skip.
            if (
                lastState?.timestamp === value.timestamp &&
                lastState?.status === status
            )
                return;

            // Emit the changed stroke to `LiveCanvas`
            this.handleNewOrChangedStroke(value, status);
        });

        // Any unchecked nodes are no longer in dryStrokeMap, so we notify they were removed
        this.previousCheckedNodes.forEach((value) => {
            // Set the stroke as rendered
            this.renderedStrokesMap.set(value.id, {
                timestamp: value.timestamp,
                status: Tree.status(value),
            });
            // We need to remove the node from `InkingManager` so we notify `LiveCanvas` that it was removed.
            this.emit(StorageSolutionEvents.strokeRemoved, value.id, false);
        });
        // Set the most recent checked nodes as previous for susequent change comparisons
        this.previousCheckedNodes = newCheckedNodes;
    }

    forEach(
        callbackfn: (value: IStroke, key: string) => void,
        thisArg?: any
    ): void {
        this.root.dryInkMap.forEach((value, key) => {
            const stroke = value.deserialize();
            this.renderedStrokesMap.set(value.id, {
                timestamp: value.timestamp,
                status: Tree.status(value),
            });
            callbackfn(stroke, key);
        });
    }

    set(stroke: IStroke): void {
        // We will have already rendered the change locally, so we set it as rendered
        this.renderedStrokesMap.set(stroke.id, {
            timestamp: stroke.timeStamp,
            status: TreeStatus.InDocument,
        });
        // If the node already exists in the map, update changable values rather than replace the node
        const existingNode = this.root.dryInkMap.get(stroke.id);
        if (existingNode) {
            // TODO: down the road, it would be good to only update the values that changed
            Tree.runTransaction(existingNode, () => {
                existingNode.points = stroke.serializePoints();
                existingNode.timestamp = stroke.timeStamp;
                existingNode.version = stroke.version;
                existingNode.clientId = stroke.clientId;
                existingNode.brush.type = stroke.brush.type;
                existingNode.brush.tipSize = stroke.brush.tipSize;
                existingNode.brush.tip = stroke.brush.tip;
                existingNode.brush.endArrow = stroke.brush.endArrow;
                existingNode.brush.color.r = stroke.brush.color.r;
                existingNode.brush.color.g = stroke.brush.color.g;
                existingNode.brush.color.b = stroke.brush.color.b;
            });
            return;
        }
        // Set the new stroke to the map
        this.root.dryInkMap.set(stroke.id, LiveCanvasStroke.fromStroke(stroke));
    }
    delete(strokeId: string): void {
        const stroke = this.root.dryInkMap.get(strokeId);
        if (!stroke) return;
        // We will have already rendered the change locally, so we set it as rendered
        this.renderedStrokesMap.set(stroke.id, {
            timestamp: stroke.timestamp,
            status: TreeStatus.Removed,
        });
        this.root.dryInkMap.delete(stroke.id);
    }
    clear(): void {
        // We will have already rendered the change locally, so we clear it
        this.renderedStrokesMap.clear();
        // Delete all strokes in the map
        this.root.dryInkMap.clear();
    }
    dispose(): void {
        // Unsubscribe to listeners
        this.unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
        // Reset rendered strokes and previously checked nodes
        this.renderedStrokesMap.clear();
        this.previousCheckedNodes.clear();
    }

    private handleNewOrChangedStroke(
        stroke: LiveCanvasStroke,
        status: TreeStatus
    ) {
        // Mark the change as rendered
        this.renderedStrokesMap.set(stroke.id, {
            timestamp: stroke.timestamp,
            status,
        });
        // Update the existing stroke or create a new one
        const existingStroke = this.inkingManager.getStroke(stroke.id);
        const strokeToEmit = stroke.deserialize(existingStroke);
        // Emit the stroke to `LiveCanvas`
        this.emit(StorageSolutionEvents.strokeChanged, strokeToEmit, false);
    }
}

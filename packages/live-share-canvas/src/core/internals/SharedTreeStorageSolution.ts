import { IStroke } from "../Stroke";
import { LiveCanvasStroke, LiveCanvasTreeNode } from "../LiveCanvasTreeSchema";
import { Tree, TreeStatus } from "fluid-framework";
import { InkingManager } from "../InkingManager";
import { LiveCanvasStorageSolution, StorageSolutionEvents } from ".";

export class SharedTreeStorageSolution extends LiveCanvasStorageSolution {
    private unsubscribeListeners: (() => void)[] = [];
    private previousCheckedNodes: Map<string, LiveCanvasStroke> = new Map();
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
        this.setupListeners();
    }

    private setupListeners(checkForChanges: boolean = false) {
        this.unsubscribeListeners.forEach((unsubscribe) => unsubscribe());

        const unsubscribe = Tree.on(this.root.dryInkMap, "nodeChanged", () => {
            this.setupListeners(true);
        });
        this.unsubscribeListeners = [unsubscribe];
        if (checkForChanges) {
            if (this.root.dryInkMap.size === 0) {
                if (this.renderedStrokesMap.size === 0) {
                    // There is no change to what has been rendered
                    return;
                }
                this.renderedStrokesMap.clear();
                this.emit("strokesCleared", false);
                return;
            }
        }
        // Track the checked nodes so we can set into this.previousCheckedNodes after we notify of removed nodes
        const newCheckedNodes: Map<string, LiveCanvasStroke> = new Map();
        this.root.dryInkMap.forEach((value, key) => {
            // We checked this node, any leftovers we will notify that the node was removed
            this.previousCheckedNodes.delete(key);
            newCheckedNodes.set(key, value);
            // Listen for changes to the strokes
            const nodeUnsubscribe = Tree.on(value, "treeChanged", () => {
                this.renderedStrokesMap.set(value.id, {
                    timestamp: value.timestamp,
                    status: Tree.status(value),
                });
                const existingStroke = this.inkingManager.getStroke(value.id);
                this.emit(
                    StorageSolutionEvents.strokeChanged,
                    value.deserialize(existingStroke),
                    false
                );
            });
            this.unsubscribeListeners.push(nodeUnsubscribe);

            if (!checkForChanges) return;

            // Check for existing timestamp
            const lastState = this.renderedStrokesMap.get(key);
            const status = Tree.status(value);
            // if undefined, it is a new stroke.
            if (
                lastState?.timestamp !== value.timestamp ||
                lastState?.status !== status
            ) {
                this.renderedStrokesMap.set(value.id, {
                    timestamp: value.timestamp,
                    status,
                });
                if (Tree.status(value) === TreeStatus.InDocument) {
                    // Update the existing stroke or create a new one
                    const existingStroke = this.inkingManager.getStroke(
                        value.id
                    );
                    this.emit(
                        StorageSolutionEvents.strokeChanged,
                        value.deserialize(existingStroke),
                        false
                    );
                } else {
                    // We need to remove the node from `InkingManager`
                    this.emit(StorageSolutionEvents.strokeRemoved, key, false);
                }
            }
        });

        // Any unchecked nodes are no longer in dryStrokeMap, so we notify they were removed
        this.previousCheckedNodes.forEach((value) => {
            this.renderedStrokesMap.set(value.id, {
                timestamp: value.timestamp,
                status: Tree.status(value),
            });
            // We need to remove the node from `InkingManager`
            this.emit(StorageSolutionEvents.strokeRemoved, value.id, false);
        });
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
        } else {
            // Set the new stroke to the map
            this.root.dryInkMap.set(
                stroke.id,
                LiveCanvasStroke.fromStroke(stroke)
            );
        }
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
        Tree.runTransaction(this.root.dryInkMap, (node) => {
            node.forEach((value) => {
                node.delete(value.id);
            });
        });
    }
    dispose(): void {
        this.unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
        this.renderedStrokesMap.clear();
        this.previousCheckedNodes.clear();
    }
}

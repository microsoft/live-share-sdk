import {
    ISequencedDocumentMessage,
    IValueChanged,
    SharedMap,
} from "fluid-framework/legacy";
import {
    LiveCanvasStorageSolution,
    StorageSolutionEvents,
    isClearEvent,
} from ".";
import { IStroke, Stroke } from "../Stroke";
import { InkingManager } from "../InkingManager";

export class SharedMapStorageSolution extends LiveCanvasStorageSolution {
    private registeredListeners = new Map<string, Function>();
    constructor(
        private dryInkMap: SharedMap,
        private inkingManager: InkingManager
    ) {
        super();
        this.setupListeners();
    }

    setupListeners() {
        const valueChangedListener = (
            changed: IValueChanged,
            local: boolean
        ) => {
            const serializedStroke: string | undefined = this.dryInkMap.get(
                changed.key
            );
            if (serializedStroke) {
                const stroke =
                    this.inkingManager.getStroke(changed.key) ?? new Stroke();
                stroke.deserialize(serializedStroke);
                this.emit(StorageSolutionEvents.strokeChanged, stroke, local);
            } else {
                this.emit(
                    StorageSolutionEvents.strokeRemoved,
                    changed.key,
                    local
                );
            }
        };
        this.registeredListeners.set("valueChanged", valueChangedListener);
        this.dryInkMap.on("valueChanged", valueChangedListener);
        const opListener = (
            op: ISequencedDocumentMessage,
            local: boolean
        ): void => {
            if (isClearEvent(op.contents)) {
                this.emit(StorageSolutionEvents.strokesCleared, local);
            }
        };
        this.registeredListeners.set("op", opListener);
        this.dryInkMap.on("op", opListener);
    }

    forEach(
        callbackfn: (value: IStroke, key: string) => void,
        thisArg?: any
    ): void {
        // Setup incoming dry ink changes
        this.dryInkMap.forEach((value: string) => {
            const stroke = new Stroke();
            stroke.deserialize(value);

            callbackfn(stroke, stroke.id);
        });
    }
    set(stroke: IStroke): void {
        this.dryInkMap.set(stroke.id, stroke.serialize());
    }
    delete(strokeId: string): void {
        this.dryInkMap.delete(strokeId);
    }
    clear(): void {
        this.dryInkMap.clear();
    }
    dispose(): void {
        this.registeredListeners.forEach((listener, key) => {
            this.dryInkMap.off(key as any, listener as any);
        });
    }
}

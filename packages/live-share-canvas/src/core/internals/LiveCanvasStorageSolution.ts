import { IEvent } from "@fluidframework/core-interfaces";
import { TypedEventEmitter } from "@fluid-internal/client-utils";
import { IStroke } from "../Stroke";

export enum StorageSolutionEvents {
    strokeChanged = "strokeChanged",
    strokeRemoved = "strokeRemoved",
    strokesCleared = "strokesCleared",
}

/**
 * @hidden
 */
interface ILiveCanvasStorageSolutionEvents extends IEvent {
    (
        event: StorageSolutionEvents.strokeChanged,
        listener: (stroke: IStroke, local: boolean) => void
    ): void;
    (
        event: StorageSolutionEvents.strokeRemoved,
        listener: (strokeId: IStroke, local: boolean) => void
    ): void;
    (
        event: StorageSolutionEvents.strokesCleared,
        listener: (local: boolean) => void
    ): void;
}

export abstract class LiveCanvasStorageSolution extends TypedEventEmitter<ILiveCanvasStorageSolutionEvents> {
    abstract forEach(
        callbackfn: (value: IStroke, key: string) => void,
        thisArg?: any
    ): void;
    abstract set(stroke: IStroke): void;
    abstract delete(strokeId: string): void;
    abstract clear(): void;
    abstract dispose(): void;
}

import {
    GetLocalUserCanSend,
    ILiveEvent,
    UpdateSynchronizationState,
} from "../interfaces";
import { IEvent } from "@fluidframework/common-definitions";

/**
 * @hidden
 */
export interface StateSyncEventContent {
    [id: string]: Omit<ILiveEvent<any>, "name" | "clientId">;
}

/**
 * @hidden
 */
export interface GetAndUpdateStateHandlers<TState> {
    shouldUpdateTimestampPeriodically: boolean;
    updateState: UpdateSynchronizationState<TState>;
    getLocalUserCanSend: GetLocalUserCanSend;
}

/**
 * @hidden
 */
export type ProcessRelatedChangeHandler = (
    objectId: string,
    event: ILiveEvent<any>
) => void;

/**
 * @hidden
 */
export interface IContainerLiveObjectStoreEvents extends IEvent {
    /**
     * Event listener for when a value in the LiveObjectManager is updated
     * @param event update
     * @param listener listener function
     * @param listener.objectId the LiveDataObject identifier
     * @param listener.event the event that was updated
     * @param listener.local whether the local user initiated the change
     * @param listener.processRelatedChange callback to make a related change, such as updating the state for the local user
     */
    (
        event: "update",
        listener: (
            objectId: string,
            event: ILiveEvent<any>,
            local: boolean,
            processRelatedChange: ProcessRelatedChangeHandler
        ) => void
    ): void;
}

/**
 * @hidden
 */
export type ILiveClientEventMap<TState = any> = Map<string, ILiveEvent<TState>>;
/**
 * @hidden
 */
export type ILiveObjectStore = Map<string, ILiveClientEventMap>;

import { IEvent } from "@microsoft/live-share";
import { IEvent as IFluidEvent } from "@fluidframework/core-interfaces";
import { ExtendedMediaSessionActionSource } from "../MediaSessionExtensions.js";

/**
 * @hidden
 */
export interface IGroupStateEvent extends IEvent {
    clientId: string;
    source: ExtendedMediaSessionActionSource;
}

/**
 * @hidden
 */
export interface IGenericTypedEvents extends IFluidEvent {
    /**
     * Event listener for events emitted
     * @param event update
     * @param listener listener function
     * @param listener.event the event instance
     */
    (event: string, listener: (event: any) => void): void;
}

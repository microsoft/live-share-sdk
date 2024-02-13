import { IEvent } from "@microsoft/live-share";
import { ExtendedMediaSessionActionSource } from "../MediaSessionExtensions";

/**
 * @hidden
 */
export interface IGroupStateEvent extends IEvent {
    clientId: string;
    source: ExtendedMediaSessionActionSource;
}

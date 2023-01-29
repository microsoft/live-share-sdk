import { LiveTelemetryLogger, UserMeetingRole } from "@microsoft/live-share";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";
import {
    ExtendedMediaSessionAction,
    IMediaPlayer,
    IMediaPlayerState,
    LiveMediaSession,
    LiveMediaSessionCoordinator,
    MediaPlayerSynchronizer,
    MediaSessionActionThrottler,
} from "@microsoft/live-share-media";

export class TurboLiveMediaSession extends TurboDataObject<
    any,
    LiveMediaSession
> {
    private _isInitialized: boolean = false;
    private _allowedRoles?: UserMeetingRole[];

    constructor(dataObject: LiveMediaSession) {
        const onDidOverrideDataObject = async () => {
            if (this._isInitialized) {
                try {
                    await this.dataObject.initialize(this._allowedRoles);
                } catch (error: any) {
                    console.error(error);
                }
            }
        };
        super(dataObject, [], onDidOverrideDataObject);
    }

    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Extension point that lets applications replace the default logic for throttling the sessions
     * local sync behavior.
     *
     * @remarks
     * The `LiveMediaCoordinator` is fairly aggressive at wanting to keep the local media player
     * in sync with the rest of the group. This aggressiveness can result in the coordinator sending
     * new sync actions before the local player has finished responding to the previous sync action.
     * The `ActionThrottler` gives apps fine grain control over how aggressive they want sync to be.
     *
     * By default, a `RepeatedAction` throttler is used which prevents the same sync action from
     * being sent within an adjustable time period.
     */
    public get actionThrottler(): MediaSessionActionThrottler {
        return this.dataObject.actionThrottler;
    }

    public set actionThrottler(value: MediaSessionActionThrottler) {
        this.dataObject.actionThrottler = value;
    }

    /**
     * The group coordinator for the session.
     */
    public get coordinator(): LiveMediaSessionCoordinator {
        return this.dataObject.coordinator;
    }

    /**
     * Returns the logger used by the session and coordinator.
     *
     * @remarks
     * This is used by the `MediaPlayerSynchronizer` to log events.
     */
    public get logger(): LiveTelemetryLogger {
        return this.dataObject.logger;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
    public async initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        await this.dataObject.initialize(allowedRoles);
        this._allowedRoles = allowedRoles;
        this._isInitialized = true;
    }

    /**
     * Registers an action handler with the session.
     * @param action Name of the action to register a handler for.
     * @param handler Function called when the action is triggered.
     */
    public setActionHandler(
        action: ExtendedMediaSessionAction,
        handler: MediaSessionActionHandler | null
    ): void {
        return this.dataObject.setActionHandler(action, handler);
    }

    /**
     * Registers a handler that will be queried anytime the group coordinate needs to know the
     * local players transport state and position.
     */
    public setRequestPlayerStateHandler(handler: () => IMediaPlayerState) {
        return this.dataObject.setRequestPlayerStateHandler(handler);
    }

    /**
     * Begins synchronizing the playback of a media element.
     * @param player Something that "looks like" and HTML Media Element.
     * @returns A new synchronizer instance. Call `synchronizer.end()` to stop synchronizing the elements playback.
     */
    public synchronize(player: IMediaPlayer): MediaPlayerSynchronizer {
        return this.dataObject.synchronize(player);
    }

    public static async create(
        turboClient: IFluidTurboClient,
        uniqueKey: string,
        onDidFirstInitialize?: (dds: TurboLiveMediaSession) => void
    ): Promise<TurboLiveMediaSession> {
        const results = await turboClient.getDDS<any, LiveMediaSession>(
            `<LiveMediaSession>:${uniqueKey}`,
            LiveMediaSession,
            (dds: IFluidLoadable): TurboLiveMediaSession => {
                return new TurboLiveMediaSession(dds as LiveMediaSession);
            }
        );
        const dds = results.dds as TurboLiveMediaSession;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}

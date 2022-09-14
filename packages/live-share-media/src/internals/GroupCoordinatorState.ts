/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IEvent, ILiveShareEvent, LiveEvent, TimeInterval, IRuntimeSignaler, LiveTelemetryLogger } from '@microsoft/live-share';
import EventEmitter from 'events';
import { ExtendedMediaMetadata, CoordinationWaitPoint, ExtendedMediaSessionPlaybackState, ExtendedMediaSessionActionDetails } from '../MediaSessionExtensions';
import { GroupPlaybackTrack, GroupPlaybackTrackEvents, IPlaybackTrack } from './GroupPlaybackTrack';
import { GroupTransportState, ITransportState } from './GroupTransportState';
import { GroupPlaybackPosition, ICurrentPlaybackPosition } from './GroupPlaybackPosition';
import { IMediaPlayerState } from '../LiveMediaSessionCoordinator';
import { GroupTransportStateEvents } from './GroupTransportState';
import { GroupPlaybackTrackData, PlaybackTrackDataEvents, IPlaybackTrackData } from './GroupPlaybackTrackData';
import { TelemetryEvents } from './consts';

/**
 * @hidden
 */
export interface IPositionUpdateEvent extends ILiveShareEvent {
    track: IPlaybackTrack;
    trackData: IPlaybackTrackData;
    transport: ITransportState;
    playbackState: ExtendedMediaSessionPlaybackState;
    position: number;
    waitPoint?: CoordinationWaitPoint;
}

/**
 * @hidden
 */
export interface ITransportCommandEvent extends ILiveShareEvent {
    track: IPlaybackTrack;
    position: number;
}

/**
 * @hidden
 */
export interface ISetTrackEvent extends ILiveShareEvent {
    metadata: ExtendedMediaMetadata|null;
    waitPoints: CoordinationWaitPoint[];
}

/**
 * @hidden
 */
export interface ISetTrackDataEvent extends ILiveShareEvent {
    data: object|null;
}

/**
 * @hidden
 */
 export interface ITriggerActionEvent extends IEvent {
    details: ExtendedMediaSessionActionDetails;
}

/**
 * @hidden
 */
export enum GroupCoordinatorStateEvents {
    newwaitpoint = 'newwaitpoint',
    triggeraction = 'triggeraction'
}

/**
 * @hidden
 */
 export class GroupCoordinatorState extends EventEmitter {
    private readonly _runtime: IRuntimeSignaler;
    private readonly _logger: LiveTelemetryLogger;
    private readonly _maxPlaybackDrift: TimeInterval;
    private _getMediaPlayerState: () => IMediaPlayerState;

    // Shared group state
    private _playbackTrack: GroupPlaybackTrack;
    private _playbackTrackData: GroupPlaybackTrackData;
    private _transportState: GroupTransportState;
    private _playbackPosition: GroupPlaybackPosition;

    // Suspension tracking
    private _suspensionCnt: number = 0;
    private _waitPoint?: CoordinationWaitPoint;

    // "Soft Suspension" tracking
    // - Soft suspensions temporarily disconnect the local media session when transitioning between
    //   paused, playing, and none states. This is to give the local client time to finish any inprogress
    //   operations like sending a transport command or ending a suspension.
    private _lastStateChange: ExtendedMediaSessionPlaybackState = 'none';
    private _lastStateChangeTime: number = 0;

    constructor (runtime: IRuntimeSignaler, maxPlaybackDrift: TimeInterval, positionUpdateInterval: TimeInterval, getMediaPlayerState: () => IMediaPlayerState) {
        super();
        this._runtime = runtime;
        this._logger = new LiveTelemetryLogger(runtime);
        this._maxPlaybackDrift = maxPlaybackDrift;
        this._playbackTrack = new GroupPlaybackTrack(getMediaPlayerState);
        this._playbackTrackData = new GroupPlaybackTrackData(this._playbackTrack);
        this._transportState = new GroupTransportState(this._playbackTrack, getMediaPlayerState);
        this._playbackPosition = new GroupPlaybackPosition(this._transportState, this._runtime, positionUpdateInterval);
        this._getMediaPlayerState = getMediaPlayerState;

        // Listen track related events
        this._playbackTrack.on(GroupPlaybackTrackEvents.trackChange, evt => {
            if (!this.isSuspended) {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TrackChanged);
                this.emitSetTrack(evt.metadata!);
            } else {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TrackChangeDelayed);
            }
        });

        // Listen for track data changes
        this._playbackTrackData.on(PlaybackTrackDataEvents.dataChange, evt => {
            if (!this.isSuspended && !this.isWaiting) {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TrackDataChanged);
                this.emitTriggerAction({action: 'datachange', data: evt.data});
            } else {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TrackDataChangeDelayed);
            }
        });

        // Listen to transport related events
        this._transportState.on(GroupTransportStateEvents.transportStateChange, evt => {
            if (!this.isSuspended && !this.isWaiting) {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TransportStateChanged, null, {
                    action: evt.action,
                    seekTime: evt.seekTime
                });

                // Trigger action
                switch (evt.action) {
                    case 'play':
                        this.emitTriggerAction({action: 'play', seekTime: evt.seekTime});
                        break;

                    case 'pause':
                        this.emitTriggerAction({action: 'pause', seekTime: evt.seekTime});
                        break;

                    case 'seekto':
                        this.emitTriggerAction({action: 'seekto', seekTime: evt.seekTime});
                        break;
                }
            } else {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TransportStateChangeDelayed, null, {
                    action: evt.action,
                    seekTime: evt.seekTime
                });
            }
        });
    }

    public get playbackTrack(): GroupPlaybackTrack {
        return this._playbackTrack;
    }

    public get playbackTrackData(): GroupPlaybackTrackData {
        return this._playbackTrackData;
    }

    public get transportState(): GroupTransportState {
        return this._transportState;
    }

    public get playbackPosition(): GroupPlaybackPosition {
        return this._playbackPosition;
    }

    public get waitingAt(): CoordinationWaitPoint|undefined {
        return this._waitPoint;
    }

    public get isSuspended(): boolean {
        return this._suspensionCnt > 0;
    }

    public get isWaiting(): boolean {
        return !!this._waitPoint;
    }

    public beginSuspension(waitPoint?: CoordinationWaitPoint): void {
        this._suspensionCnt++;

        if (waitPoint) {
            // Save most recent wait point
            this._waitPoint = waitPoint;

            // Add to track state if dynamic wait point
            this.playbackTrack.addWaitPoint(waitPoint);
        }
    }

    public endSuspension(syncState: boolean): void {
        if (this._suspensionCnt == 0) {
            throw new Error(`Too many suspensions.`);
        }

        this._suspensionCnt--;
        if (this._suspensionCnt == 0 && syncState) {
            // Sync media session to group
            this.syncLocalMediaSession();
        }
    }

    public createPositionUpdateEvent(state: IMediaPlayerState): Partial<IPositionUpdateEvent> {
        const { positionState, playbackState } = state;
        if (this.isSuspended) {
            // Report suspension state
            return {
                track: this.playbackTrack.current,
                trackData: this.playbackTrackData.current,
                transport: this.transportState.current,
                playbackState: 'suspended',
                position: positionState?.position || 0.0,
                waitPoint: this._waitPoint
            };
        } else {
            // Report current position
            return {
                track: this.playbackTrack.current,
                trackData: this.playbackTrackData.current,
                transport: this.transportState.current,
                playbackState: this._waitPoint ? 'waiting' : playbackState,
                position: positionState?.position || 0.0,
                waitPoint: this._waitPoint
            };
        }
    }

    public handleSetTrack(event: ISetTrackEvent, local: boolean): void {
        // Update shared track
        // - Will trigger 'trackChange' event to update media session
        const updated = this.playbackTrack.updateTrack({
            metadata: event.metadata,
            waitPoints: event.waitPoints,
            timestamp: event.timestamp,
            clientId: event.clientId || ''
        });

        if (updated) {
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemoteSetTrackReceived, null, {correlationId: LiveTelemetryLogger.formatCorrelationId(event.clientId, event.timestamp)});
        }
    }

    public handleSetTrackData(event: ISetTrackDataEvent, local: boolean): void {
        // Update shared track data
        // - Will trigger 'dataChange' event to update media session
        const updated = this.playbackTrackData.updateData({
            data: event.data,
            timestamp: event.timestamp,
            clientId: event.clientId || ''
        });

        if (updated) {
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemoteSetTrackReceived, null, {correlationId: LiveTelemetryLogger.formatCorrelationId(event.clientId, event.timestamp)});
        }
    }

    public handleTransportCommand(event: ITransportCommandEvent, local: boolean): void {
        // Ensure change is for current track
        // - Will trigger a 'trackChange' event if newer track.
        this.playbackTrack.updateTrack(event.track);
        if (this.playbackTrack.compare(event.track.metadata)) {
            // Update playback state
            let playbackState = this.transportState.playbackState;
            switch (event.name) {
                case 'play':
                    playbackState = 'playing';
                    break;
                case 'pause':
                    playbackState = 'paused';
                    break;
            }

            // Try to update playback state
            const newState: ITransportState = {
                playbackState: playbackState,
                startPosition: event.position,
                timestamp: event.timestamp,
                clientId: event.clientId || ''
            };
            const updated = this.transportState.updateState(newState);

            if (updated) {
                const correlationId = LiveTelemetryLogger.formatCorrelationId(event.clientId, event.timestamp);
                switch (event.name) {
                    case 'play':
                        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemotePlayReceived, null, {correlationId: correlationId});
                        break;
                    case 'pause':
                        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemotePauseReceived, null, {correlationId: correlationId});
                        break;
                    case 'seekTo':
                        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemoteSeekToReceived, null, {correlationId: correlationId});
                        break;
                }

            }
        }
    }

    public handlePositionUpdate(event: IPositionUpdateEvent, local: boolean): void {
        // Ensure change is for current track
        // - Will trigger a 'trackChange' event if newer track.
        this.playbackTrack.updateTrack(event.track);
        if (this.playbackTrack.compare(event.track.metadata)) {
            // Ensure we have the latest track data
            this.playbackTrackData.updateData(event.trackData);

            // Update transport state if needed
            // - Ignore transport state changes if the client has ended as this will cause the local
            //   player to start playback even though the video may have ended for everyone.
            if (event.playbackState != 'ended') {
                this.transportState.updateState(event.transport);
            }

            // Ensure change is for current transport state
            if (this.transportState.compare(event.transport)) {
                // Update playback position
                const position: ICurrentPlaybackPosition = {
                    playbackState: event.playbackState,
                    waitPoint: event.waitPoint,
                    position: event.position,
                    timestamp: event.timestamp,
                    clientId: event.clientId || ''
                };
                this.playbackPosition.UpdatePlaybackPosition(position);

                // Ensure local media session is in sync with group
                if (local && !this.isSuspended) {
                    // Begin a "soft suspension" on select state changes
                    // - This is needed because the catchup logic can try to sink the client with
                    //  the rest of the group while the local player is trying to to seek to a
                    //  new position.
                    switch (event.playbackState) {
                        case 'none':
                        case 'paused':
                        case 'playing':
                            if (event.playbackState != this._lastStateChange) {
                                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.BeginSoftSuspension, null, {playbackState: event.playbackState});
                                this._lastStateChange = event.playbackState;
                                this._lastStateChangeTime = LiveEvent.getTimestamp();
                            }
                            break;
                    }

                    // Are we waiting?
                    if (this.isWaiting) {
                        // Check for end of waiting
                        if (this.playbackPosition.clientsWaiting == 0) {
                            this._waitPoint = undefined;

                            // Start syncing again
                            this.syncLocalMediaSession();
                        }
                    } else {
                        // Sync client with group
                        this.syncLocalMediaSession();
                    }
                }
            }
        }
    }

    public async syncLocalMediaSession(): Promise<void> {
        // Skip further syncs if we're waiting or in a "soft suspension".
        const softSuspensionDelta = LiveEvent.getTimestamp() - this._lastStateChangeTime;
        if (!this.isWaiting && softSuspensionDelta >= 1000) {
            let { metadata, trackData, positionState, playbackState } = this._getMediaPlayerState();
            this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.CheckingForSyncIssues);

            // Check for track change
            if (!this.playbackTrack.compare(metadata)) {
                this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TrackOutOfSync);
                this.emitSetTrack(this.playbackTrack.metadata!);
                return;
            }

            // Once local playback has ended there's no need to further sync the client. In fact
            // doing so could cause the player to loop.
            // - The playbackPosition.trackEnded check is to catch late joiners and prevents syncing if everyone
            //   else has finished the video.
            // - Should another user seek or press play after the video has ended that will cause
            //   a transport action to trigger which will take the player out of the ended state.
            if (playbackState != "ended" && !this._playbackPosition.trackEnded) {
                // Ensure we have a position
                let position = positionState?.position;
                if (position == undefined) {
                    position = 0.0;
                }

                // Check for catchup
                // - Target can return -1 in cases where there is no position tracking data
                const target = this.playbackPosition.targetPosition;
                if (target >= 0.0 && Math.abs(target - position) >= this._maxPlaybackDrift.seconds) {
                    this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.PositionOutOfSync, null, {
                        current: position,
                        target: target
                    });
                    await this.emitTriggerAction({action: 'catchup', seekTime: target});
                }

                // Sync transport state
                if (this.transportState.playbackState != playbackState) {
                    this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TransportOutOfSync, null, {
                        current: playbackState,
                        target: this.transportState.playbackState
                    });
                    switch (this.transportState.playbackState) {
                        case 'playing':
                            await this.emitTriggerAction({action: 'play'});
                            break;
                        case 'paused':
                            await this.emitTriggerAction({action: 'pause'});
                            break;
                    }
                }

                // Sync track data
                if (JSON.stringify(this.playbackTrackData.data) != JSON.stringify(trackData)) {
                    this._logger.sendTelemetryEvent(TelemetryEvents.GroupCoordinator.TrackDataOutOfSync);
                    await this.emitTriggerAction({action: 'datachange', data: this.playbackTrackData.data});
                }
            }

        }
    }

    private emitSetTrack(metadata: ExtendedMediaMetadata): void {
        // Reset tracking states
        this._waitPoint = undefined;

        // Trigger settrack action
        this.emitTriggerAction({action: 'settrack', metadata: metadata});
    }

    private emitTriggerAction(details: ExtendedMediaSessionActionDetails): void {
        const evt: ITriggerActionEvent = {
            name: GroupCoordinatorStateEvents.triggeraction,
            details: details
        };
         this.emit(GroupCoordinatorStateEvents.triggeraction, evt);
    }
}
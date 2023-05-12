/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * @hidden
 * List of telemetry events. Wrap with a call to transmit() if the event should be transmitted to
 * the telemetry service.
 */
export const TelemetryEvents = {
    MediaPlayerSynchronizer: {
        SynchronizationStarted:
            "MediaPlayerSynchronizer:SynchronizationStarted",
        PlayerEvent: "MediaPlayerSynchronizer:PlayerEvent",
        PlayAction: "MediaPlayerSynchronizer:PlayAction",
        PauseAction: "MediaPlayerSynchronizer:PauseAction",
        SeekToAction: "MediaPlayerSynchronizer:SeekToAction",
        CatchupAction: "MediaPlayerSynchronizer:CatchupAction",
        SetTrackAction: "MediaPlayerSynchronizer:SetTrackAction",
        DataChangeAction: "MediaPlayerSynchronizer:DataChangeAction",
        UserTappedVideoToPlay: transmit(
            "MediaPlayerSynchronizer:UserTappedVideoToPlay"
        ),
        UserTappedVideoToPlayError:
            "MediaPlayerSynchronizer:UserTappedVideoToPlayError",
        PlaybackRateChangeBlocked:
            "MediaPlayerSynchronizer:PlaybackRateChangeBlocked",
        PlayerBlockedOperation: transmit(
            "MediaPlayerSynchronizer:PlayerBlockedOperation"
        ),
        SeekingPlayerToStartPosition:
            "MediaPlayerSynchronizer:SeekingPlayerToStartPosition",
        BeginSeekCalled: "MediaPlayerSynchronizer:BeginSeekCalled",
        EndSeekCalled: "MediaPlayerSynchronizer:EndSeekCalled",
        PlayCalled: "MediaPlayerSynchronizer:PlayCalled",
        PauseCalled: "MediaPlayerSynchronizer:PauseCalled",
        SeekToCalled: "MediaPlayerSynchronizer:SeekToCalled",
        SetTrackCalled: "MediaPlayerSynchronizer:SetTrackCalled",
        SetTrackDataCalled: "MediaPlayerSynchronizer:SetTrackDataCalled",
    },
    MediaSession: {
        PlayAction: transmit("MediaSession:PlayAction"),
        PauseAction: transmit("MediaSession:PauseAction"),
        SeekToAction: transmit("MediaSession:SeekToAction"),
        CatchUpAction: transmit("MediaSession:CatchUpAction"),
        SetTrackAction: transmit("MediaSession:SetTrackAction"),
        DataChangeAction: "MediaSession:DataChangeAction",
        BeginPositionUpdateTimer: "MediaSession:BeginPositionUpdateTimer",
    },
    SessionCoordinator: {
        PlayCalled: transmit("SessionCoordinator:PlayCalled"),
        PauseCalled: transmit("SessionCoordinator:PauseCalled"),
        SeekToCalled: transmit("SessionCoordinator:SeekToCalled"),
        SetTrackCalled: transmit("SessionCoordinator:SetTrackCalled"),
        SetTrackDataCalled: "SessionCoordinator:SetTrackDataCalled",
        BeginSuspension: "SessionCoordinator:BeginSuspension",
        BeginSuspensionAndWait: transmit(
            "SessionCoordinator:BeginSuspensionAndWait"
        ),
        EndSuspension: "SessionCoordinator:EndSuspension",
        EndSuspensionAndWait: transmit(
            "SessionCoordinator:EndSuspensionAndWait"
        ),
        RemoteJoinReceived: "SessionCoordinator:RemoteJoinReceived",
        RemoteSetTrackReceived: transmit(
            "SessionCoordinator:RemoteSetTrackReceived"
        ),
        RemoteSetTrackDataReceived: transmit(
            "SessionCoordinator:RemoteSetTrackDataReceived"
        ),
        RemotePlayReceived: transmit("SessionCoordinator:RemotePlayReceived"),
        RemotePauseReceived: transmit("SessionCoordinator:RemotePauseReceived"),
        RemoteSeekToReceived: transmit(
            "SessionCoordinator:RemoteSeekToReceived"
        ),
        PositionUpdateEventError: "SessionCoordinator:PositionUpdateEventError",
        SendJoinedEventError: "SessionCoordinator:SendJoinedEventError",
    },
    GroupCoordinator: {
        TrackChanged: "GroupCoordinator:TrackChanged",
        TrackChangeDelayed: "GroupCoordinator:TrackChangeDelayed",
        TrackDataChanged: "GroupCoordinator:TrackDataChanged",
        TrackDataChangeDelayed: "GroupCoordinator:TrackDataChangeDelayed",
        TransportStateChanged: "GroupCoordinator:TransportStateChanged",
        TransportStateChangeDelayed:
            "GroupCoordinator:TransportStateChangeDelayed",
        BeginSoftSuspension: "GroupCoordinator:BeginSoftSuspension",
        CheckingForSyncIssues: "GroupCoordinator:CheckingForSyncIssues",
        TrackOutOfSync: transmit("GroupCoordinator:TrackOutOfSync"),
        TrackDataOutOfSync: transmit("GroupCoordinator:TrackDataOutOfSync"),
        TransportOutOfSync: transmit("GroupCoordinator:TransportOutOfSync"),
        PositionOutOfSync: transmit("GroupCoordinator:PositionOutOfSync"),
    },
};

/**
 * @hidden
 */
function transmit(eventName: string): string {
    return `${eventName}#transmit`;
}

import { UserMeetingRole } from "@microsoft/live-share";
import { FC, useCallback, useEffect, useRef } from "react";
import { useMediaSynchronizer } from "@microsoft/live-share-react";
import { IMediaPlayerSynchronizerEvent, MediaPlayerSynchronizerEvents } from "@microsoft/live-share-media";

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];

const INITIAL_TRACK =
    "https://storage.googleapis.com/media-session/big-buck-bunny/trailer.mov";

export const ExampleMediaSynchronizer: FC = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const { play, pause, seekTo, mediaSynchronizer } = useMediaSynchronizer(
        "MEDIA-SESSION-ID",
        videoRef,
        INITIAL_TRACK,
        ALLOWED_ROLES
    );

    useEffect(() => {
        // Listen for player group actions for errors (e.g., play error)
        const onGroupAction = (evt: IMediaPlayerSynchronizerEvent) => {
            if (evt.error) {
                if (
                    videoRef.current &&
                    evt.details.action === "play" &&
                    evt.error.name === "NotAllowedError"
                ) {
                    // The user has not interacted with the document so the browser blocked the play action
                    // mute the player and try again
                    videoRef.current.muted = true;
                    videoRef.current.play();
                } else {
                    console.error(evt.error);
                }
            }
        };
        mediaSynchronizer?.addEventListener(
            MediaPlayerSynchronizerEvents.groupaction,
            onGroupAction
        );
        return () => {
            mediaSynchronizer?.removeEventListener(
                MediaPlayerSynchronizerEvents.groupaction,
                onGroupAction
            );
        };
    }, [mediaSynchronizer]);

    const onTogglePlayPause = useCallback(() => {
        if (videoRef.current?.paused) {
            play();
        } else {
            pause();
        }
    }, [play, pause]);

    return (
        <>
            <div>
                <video
                    ref={videoRef}
                    poster="https://images4.alphacoders.com/247/247356.jpg"
                    height={9 * 40}
                    width={16 * 40}
                />
                <div
                    className="flex row hAlign vAlign wrap"
                    style={{ marginTop: "8px" }}
                >
                    <button onClick={onTogglePlayPause}>{"Play/pause"}</button>
                    <button
                        onClick={() => {
                            seekTo(0);
                        }}
                    >
                        {"Start over"}
                    </button>
                    <button
                        onClick={() => {
                            if (videoRef.current) {
                                videoRef.current.muted =
                                    !videoRef.current.muted;
                            }
                        }}
                    >
                        {"Mute/unmute"}
                    </button>
                </div>
            </div>
        </>
    );
};

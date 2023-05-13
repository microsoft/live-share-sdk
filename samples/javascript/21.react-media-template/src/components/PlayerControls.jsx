import { formatTimeValue } from "../utils/format";
import {
    Pause24Filled,
    Play24Filled,
    SpeakerMute20Filled,
    Speaker220Filled,
    Next20Filled,
    Info24Regular,
} from "@fluentui/react-icons";
import {
    Button,
    Text,
    Popover,
    PopoverTrigger,
    PopoverSurface,
} from "@fluentui/react-components";
import { InkingControls } from "./InkingControls";
import { FlexColumn, FlexRow } from "./flex";

export const PlayerControls = ({
    endSuspension,
    inkActive,
    inkingManager,
    localUserIsEligiblePresenter,
    localUserIsPresenting,
    nextTrack,
    playerState,
    setInkActive,
    suspended,
    takeControl,
    toggleMute,
    togglePlayPause,
}) => {
    return (
        <FlexRow
            vAlignCenter
            smallGap
            spaceBetween
            style={{
                paddingBottom: "12px",
                paddingLeft: "12px",
                paddingRight: "12px",
                paddingTop: "0px",
                minWidth: "0px",
            }}
        >
            <FlexRow vAlignCenter smallGap>
                {/* Play Button */}
                <Button
                    icon={
                        playerState.isPlaying ? (
                            <Pause24Filled />
                        ) : (
                            <Play24Filled />
                        )
                    }
                    appearance="transparent"
                    title={playerState.isPlaying ? "Pause" : "Play"}
                    onClick={togglePlayPause}
                />
                {/* Next Track Button */}
                {localUserIsPresenting && (
                    <Button
                        icon={<Next20Filled />}
                        appearance="transparent"
                        title={"Next track"}
                        onClick={nextTrack}
                    />
                )}
                {/* Mute Button */}
                <Button
                    icon={
                        playerState.muted ? (
                            <SpeakerMute20Filled />
                        ) : (
                            <Speaker220Filled />
                        )
                    }
                    appearance="transparent"
                    title={playerState.muted ? "Unmute" : "Mute"}
                    onClick={toggleMute}
                />
                {/* Formatted Time Value */}
                <Text size={300} weight="medium">
                    {formatTimeValue(playerState.currentTime)}
                    {" / "}
                    {formatTimeValue(playerState.duration)}
                </Text>
            </FlexRow>
            <FlexRow vAlignCenter>
                {suspended && (
                    <Button
                        appearance="outline"
                        title={"Sync to Presenter"}
                        onClick={endSuspension}
                        style={{
                            marginLeft: "0.25rem",
                            marginRight: "0.25rem",
                            borderColor: "#6e0811",
                        }}
                    >
                        <FlexRow vAlignCenter smallGap>
                            <FlexRow
                                vAlignCenter
                                style={{
                                    padding: "0.05rem 0.5rem",
                                    backgroundColor: "#c50f1f",
                                    borderRadius: "8px",
                                    height: "auto",
                                }}
                            >
                                <Text size={100} weight="medium">
                                    {`LIVE`}
                                </Text>
                            </FlexRow>
                            <div>{`Sync to Presenter`}</div>
                        </FlexRow>
                    </Button>
                )}
                <FlexRow vAlignCenter hAlignEnd>
                    {/* Take Control */}
                    {!suspended && (
                        <Button
                            appearance="outline"
                            aria-label={
                                localUserIsPresenting
                                    ? `In control`
                                    : `Take control`
                            }
                            disabled={
                                localUserIsPresenting ||
                                !localUserIsEligiblePresenter
                            }
                            onClick={() => {
                                takeControl();
                                if (suspended) {
                                    endSuspension();
                                }
                            }}
                        >
                            <div
                                style={{
                                    color: "white",
                                    fontWeight: localUserIsPresenting
                                        ? 300
                                        : undefined,
                                    opacity: localUserIsPresenting
                                        ? "0.7"
                                        : "1",
                                }}
                            >
                                {localUserIsPresenting
                                    ? `In control`
                                    : `Take control`}
                            </div>
                        </Button>
                    )}
                    {/* Divider */}
                    <div
                        style={{
                            width: "1px",
                            height: "20px",
                            backgroundColor: "white",
                            opacity: "0.6",
                            marginLeft: "12px",
                            marginRight: "4px",
                        }}
                    />
                    {/* Ink Toggle */}
                    {localUserIsPresenting && (
                        <InkingControls
                            inkingManager={inkingManager}
                            isEnabled={inkActive}
                            setIsEnabled={setInkActive}
                        />
                    )}
                    {/* Info Popover */}
                    <Popover>
                        <PopoverTrigger>
                            <Button
                                icon={<Info24Regular />}
                                appearance="transparent"
                                title={"Info"}
                            />
                        </PopoverTrigger>
                        <PopoverSurface aria-label="video info">
                            <FlexColumn>
                                {playerState.currentPlaybackBitrate && (
                                    <div>
                                        <Text size={300}>
                                            {`Bitrate: ${
                                                playerState.currentPlaybackBitrate /
                                                1000
                                            }kbps`}
                                        </Text>
                                    </div>
                                )}
                                <div>
                                    <Text size={300}>
                                        {`Resolution: ${playerState.resolution}`}
                                    </Text>
                                </div>
                                <div>
                                    <Text size={300}>
                                        {`Heuristic Profile: ${playerState.currentHeuristicProfile}`}
                                    </Text>
                                </div>
                                <div>
                                    <Text
                                        size={300}
                                    >{`Volume: ${playerState.volume}`}</Text>
                                </div>
                            </FlexColumn>
                        </PopoverSurface>
                    </Popover>
                </FlexRow>
            </FlexRow>
        </FlexRow>
    );
};

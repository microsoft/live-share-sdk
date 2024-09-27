import { formatTimeValue } from "../utils/format";
import {
    Pause24Filled,
    Play24Filled,
    SpeakerMute20Filled,
    Speaker220Filled,
    Next20Filled,
    Info24Regular,
} from "@fluentui/react-icons";
import { FC, SetStateAction, Dispatch } from "react";
import {
    Button,
    Text,
    Popover,
    PopoverTrigger,
    PopoverSurface,
} from "@fluentui/react-components";
import { InkingControls } from "./InkingControls";
import { FlexColumn, FlexRow } from "./flex";
import { InkingManager, LiveCanvas } from "@microsoft/live-share-canvas";
import { IPlayerState } from "./MediaPlayerContainer";

interface IPlayerControlsProps {
    endSuspension: () => void;
    inkActive: boolean;
    inkingManager: InkingManager | undefined;
    liveCanvas: LiveCanvas | undefined;
    localUserIsEligiblePresenter: boolean;
    localUserIsPresenting: boolean;
    setInkActive: Dispatch<SetStateAction<boolean>>;
    suspended: boolean;
    takeControl: () => void;
}

export const PlayerControls: FC<IPlayerControlsProps> = ({
    endSuspension,
    inkActive,
    inkingManager,
    liveCanvas,
    localUserIsEligiblePresenter,
    localUserIsPresenting,
    setInkActive,
    suspended,
    takeControl,
}) => {
    return (
        <FlexRow
            vAlign="center"
            gap="small"
            spaceBetween
            style={{
                paddingBottom: "12px",
                paddingLeft: "12px",
                paddingRight: "12px",
                paddingTop: "0px",
                minWidth: "0px",
            }}
        >
            <FlexRow vAlign="center">
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
                        <FlexRow vAlign="center" gap="smaller">
                            <FlexRow
                                vAlign="center"
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
                <FlexRow vAlign="center" hAlign="end">
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

                    {/* Ink Toggle */}
                    {localUserIsPresenting && inkingManager && liveCanvas && (
                        <>
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
                            <InkingControls
                                inkingManager={inkingManager}
                                liveCanvas={liveCanvas}
                                isEnabled={inkActive}
                                setIsEnabled={setInkActive}
                            />
                        </>
                    )}
                </FlexRow>
            </FlexRow>
        </FlexRow>
    );
};

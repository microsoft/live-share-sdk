import {
    useFluidObjectsContext,
    useLiveShareContext,
    useLiveState,
} from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";
import { FC, ReactNode, useMemo, useState } from "react";
import { ExampleSharedTree } from "./ExampleSharedTree";
import { FlexColumn } from "./internals/flex";
import { NavigationBar } from "./internals/NavigationBar";
import {
    Dropdown,
    Option,
    useId,
    DropdownProps,
    Title1,
    Caption1,
} from "@fluentui/react-components";
import { ExampleLiveCanvas } from "./ExampleLiveCanvas";
import { ExampleLiveEvent } from "./ExampleLiveEvent";
import { ExampleLivePresence } from "./ExampleLivePresence";
import { ExampleLiveTimer } from "./ExampleLiveTimer";
import { ExampleMediaSynchronizer } from "./ExampleMediaSynchronizer";
import { ExampleSharedMap } from "./ExampleSharedMap";
import { ExampleSharedState } from "./ExampleSharedState";

enum OpenDDS {
    useLiveCanvas = "useLiveCanvas",
    useLiveEvent = "useLiveEvent",
    useMediaSynchronizer = "useMediaSynchronizer",
    useSharedState = "useSharedState",
    useSharedTree = "useSharedTree",
    useLiveTimer = "useLiveTimer",
    useLivePresence = "useLivePresence",
    useSharedMap = "useSharedMap",
}
const options = Object.keys(OpenDDS);

interface ILiveStateData {
    status: OpenDDS | null;
    timeStarted?: number;
}

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];
const INITIAL_STATE: ILiveStateData = {
    status: null,
};

export const ExampleLiveState: FC = () => {
    const dropdownId = useId("dropdown-default");
    const [state, setState] = useLiveState<ILiveStateData>(
        "CUSTOM-STATE-ID",
        INITIAL_STATE,
        ALLOWED_ROLES
    );
    const { timestampProvider } = useLiveShareContext();

    const onOptionSelect: DropdownProps["onOptionSelect"] = (ev, data) => {
        if (!data.optionText || !(data.optionText in OpenDDS)) return;
        setState({
            timeStarted: timestampProvider?.getTimestamp(),
            status: data.optionText as OpenDDS,
        });
    };

    return (
        <FlexColumn fill="view-height">
            <NavigationBar>
                <FlexColumn>
                    <Dropdown
                        aria-labelledby={dropdownId}
                        placeholder="Select a DDS to test..."
                        value={state.status ?? ""}
                        onOptionSelect={onOptionSelect}
                    >
                        {options.map((option) => (
                            <Option key={option}>{option}</Option>
                        ))}
                    </Dropdown>
                </FlexColumn>
            </NavigationBar>
            <FlexColumn
                scroll
                fill="both"
                style={{
                    padding: "24px",
                }}
            >
                {state.status === null && (
                    <FlexColumn gap="small">
                        <Title1>{"Welcome to Live Share React!"}</Title1>
                        <Caption1>
                            {"Pick a hook to test from the dropdown above"}
                        </Caption1>
                    </FlexColumn>
                )}
                {state.status === OpenDDS.useLiveCanvas && (
                    <ExampleLiveCanvas />
                )}
                {state.status === OpenDDS.useLiveEvent && <ExampleLiveEvent />}
                {state.status === OpenDDS.useLivePresence && (
                    <ExampleLivePresence />
                )}
                {state.status === OpenDDS.useLiveTimer && <ExampleLiveTimer />}
                {state.status === OpenDDS.useMediaSynchronizer && (
                    <ExampleMediaSynchronizer />
                )}
                {state.status === OpenDDS.useSharedMap && <ExampleSharedMap />}
                {state.status === OpenDDS.useSharedState && (
                    <ExampleSharedState />
                )}
                {state.status === OpenDDS.useSharedTree && (
                    <ExampleSharedTree />
                )}
            </FlexColumn>
        </FlexColumn>
    );
};

/**
 * Background updates are sent periodically for all `LiveDataObject` instances that use `LiveObjectSynchronizer`.
 * `LiveState` is one such data object. Setting `canSendBackgroundUpdates` will impact all other data objects as well.
 * Read the reference docs for `LiveShareClient.canSendBackgroundUpdates` for more information.
 */
const BackgroundUpdates: FC = () => {
    const { clientRef } = useFluidObjectsContext();
    const [checked, setChecked] = useState<boolean>(
        clientRef.current.canSendBackgroundUpdates
    );
    return (
        <div
            className="flex row vAlign"
            style={{
                paddingLeft: "20px",
            }}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={(ev) => {
                    clientRef.current.canSendBackgroundUpdates =
                        ev.target.checked;
                    setChecked(ev.target.checked);
                }}
            />
            <div>{"Can send background updates"}</div>
        </div>
    );
};

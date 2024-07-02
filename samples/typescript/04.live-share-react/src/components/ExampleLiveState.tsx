import {
    useFluidObjectsContext,
    useLiveShareContext,
    useLiveState,
} from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";
import { FC, ReactNode, useState } from "react";
import { ExampleSharedTree } from "./ExampleSharedTree";

enum ExampleAppStatus {
    WAITING = "WAITING",
    START = "START",
    SHAREDTREE = "SHAREDTREE",
}

interface ILiveStateData {
    status: ExampleAppStatus;
    timeStarted?: number;
}

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];
const INITIAL_STATE: ILiveStateData = {
    status: ExampleAppStatus.WAITING,
};

interface IExampleStateProps {
    waitingContent: ReactNode;
    startContent: ReactNode;
}

export const ExampleLiveState: FC<IExampleStateProps> = (props) => {
    const [state, setState] = useLiveState<ILiveStateData>(
        "CUSTOM-STATE-ID",
        INITIAL_STATE,
        ALLOWED_ROLES
    );
    const { timestampProvider } = useLiveShareContext();

    if (state.status === ExampleAppStatus.WAITING) {
        return (
            <div style={{ padding: "12px 12px" }}>
                <div className="flex row">
                    <h2>{`Start round:`}</h2>
                    <button
                        onClick={() => {
                            setState({
                                status: ExampleAppStatus.START,
                                timeStarted: timestampProvider?.getTimestamp(),
                            });
                        }}
                    >
                        {"Start"}
                    </button>
                    <button
                        onClick={() => {
                            setState({
                                status: ExampleAppStatus.SHAREDTREE,
                                timeStarted: timestampProvider?.getTimestamp(),
                            });
                        }}
                    >
                        {"Try SharedTree"}
                    </button>
                    <BackgroundUpdates />
                </div>
                <h1>{"Welcome to Fluid React!"}</h1>
                {props.waitingContent}
            </div>
        );
    }
    if (state.status === ExampleAppStatus.SHAREDTREE) {
        return (
            <div style={{ padding: "12px 12px" }}>
                <div className="flex row">
                    <h2>{`Time started: ${state.timeStarted}`}</h2>
                    <button
                        onClick={() => {
                            setState({
                                status: ExampleAppStatus.WAITING,
                            });
                        }}
                    >
                        {"End"}
                    </button>
                    <BackgroundUpdates />
                </div>
                <ExampleSharedTree />
            </div>
        );
    }
    return (
        <div style={{ padding: "12px 12px" }}>
            <div className="flex row">
                <h2>{`Time started: ${state.timeStarted}`}</h2>
                <button
                    onClick={() => {
                        setState({
                            status: ExampleAppStatus.WAITING,
                        });
                    }}
                >
                    {"End"}
                </button>
                <BackgroundUpdates />
            </div>
            {props.startContent}
        </div>
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

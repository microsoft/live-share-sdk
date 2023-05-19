import { useLiveShareContext, useLiveState } from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";
import { FC, ReactNode } from "react";

enum ExampleAppStatus {
    WAITING = "WAITING",
    START = "START",
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
                </div>
                <h1>{"Welcome to Fluid React!"}</h1>
                {props.waitingContent}
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
            </div>
            {props.startContent}
        </div>
    );
};

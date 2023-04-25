import { useLiveState } from "@microsoft/live-share-react";
import { LiveEvent, UserMeetingRole } from "@microsoft/live-share";

const ExampleAppState = {
    WAITING: "WAITING",
    START: "START",
};

const ALLOWED_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
];
const INITIAL_STATE = {
    status: ExampleAppState.WAITING,
};

export const ExampleLiveState = (props) => {
    const [state, setState] = useLiveState(
        "CUSTOM-STATE-ID",
        INITIAL_STATE,
        ALLOWED_ROLES,
    );

    if (state.status === ExampleAppState.WAITING) {
        return (
            <div style={{ padding: "12px 12px" }}>
                <div className="flex row">
                    <h2>{`Start round:`}</h2>
                    <button
                        onClick={() => {
                            setState({
                                status: ExampleAppState.START,
                                timeStarted: LiveEvent.getTimestamp(),
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
                            status: ExampleAppState.WAITING,
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

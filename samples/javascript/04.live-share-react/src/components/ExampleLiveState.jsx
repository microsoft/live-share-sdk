import { useLiveShareContext, useLiveState } from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";

const ExampleAppState = {
    WAITING: "WAITING",
    START: "START",
};

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];
const INITIAL_STATE = {
    status: ExampleAppState.WAITING,
};

export const ExampleLiveState = (props) => {
    const [state, setState] = useLiveState(
        "CUSTOM-STATE-ID",
        INITIAL_STATE,
        ALLOWED_ROLES
    );

    // timestampProvider a reference server-side timestamp, which is useful for sorting
    const { timestampProvider } = useLiveShareContext();

    if (state.status === ExampleAppState.WAITING) {
        return (
            <div style={{ padding: "12px 12px" }}>
                <div className="flex row">
                    <h2>{`Start round:`}</h2>
                    <button
                        onClick={() => {
                            setState({
                                status: ExampleAppState.START,
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

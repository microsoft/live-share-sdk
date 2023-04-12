import { useLiveState } from "@microsoft/live-share-react";
import { LiveShareClient, UserMeetingRole } from "@microsoft/live-share";

const ExampleAppState = {
    WAITING: "WAITING",
    START: "START",
};

const ALLOWED_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
    UserMeetingRole.attendee,
];

export const ExampleLiveState = (props) => {
    const [state, data, setState] = useLiveState(
        "CUSTOM-STATE-ID",
        ExampleAppState.WAITING,
        undefined,
        ALLOWED_ROLES,
    );

    if (state === ExampleAppState.WAITING) {
        return (
            <div style={{ padding: "12px 12px" }}>
                <div className="flex row">
                    <h2>{`Start round:`}</h2>
                    <button
                        onClick={() => {
                            setState(ExampleAppState.START, {
                                timeStarted: LiveShareClient.getTimestamp(),
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
                <h2>{`Time started: ${data.timeStarted}`}</h2>
                <button
                    onClick={() => {
                        setState(ExampleAppState.WAITING, undefined);
                    }}
                >
                    {"End"}
                </button>
            </div>
            {props.startContent}
        </div>
    );
};

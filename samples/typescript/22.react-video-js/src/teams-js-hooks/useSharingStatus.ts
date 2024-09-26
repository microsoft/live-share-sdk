import * as teamsJs from "@microsoft/teams-js";
import { useEffect, useState, useRef } from "react";
import { inTeams } from "../utils/inTeams";

export interface ISharingStatus {
    isAppSharing: boolean;
    isShareInitiator: boolean;
}

export const useSharingStatus = (): ISharingStatus | undefined => {
    const [status, setSharingStatus] = useState<ISharingStatus | undefined>(
        () => {
            if (inTeams()) return undefined;
            return {
                isAppSharing: false,
                isShareInitiator: getSimulatedIsShareInitiator(),
            };
        }
    );
    const intervalIdRef = useRef<NodeJS.Timer>();

    useEffect(() => {
        if (!inTeams()) return;
        if (!intervalIdRef.current) {
            if (teamsJs.meeting) {
                const setAppSharingStatus = () => {
                    teamsJs.meeting.getAppContentStageSharingCapabilities(
                        (capabilitiesError, result) => {
                            if (
                                !capabilitiesError &&
                                result?.doesAppHaveSharePermission
                            ) {
                                teamsJs.meeting.getAppContentStageSharingState(
                                    (_, state) => {
                                        if (state) {
                                            setSharingStatus(
                                                polyfillSharingStatus(state)
                                            );
                                        } else {
                                            setSharingStatus({
                                                isAppSharing: false,
                                                isShareInitiator: false,
                                            });
                                        }
                                    }
                                );
                            } else {
                                setSharingStatus({
                                    isAppSharing: false,
                                    isShareInitiator: false,
                                });
                            }
                        }
                    );
                };
                setAppSharingStatus();
                intervalIdRef.current = setInterval(() => {
                    setAppSharingStatus();
                }, 2000);
            }
        }
        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, []);

    return status;
};

/**
 * Teams JS has not yet added `isShareInitiator` to the `IAppContentStageSharingState` interface.
 * However, it does return it in the response, so we polyfill it.
 */
function polyfillSharingStatus(
    state: teamsJs.meeting.IAppContentStageSharingState
): ISharingStatus {
    if (isShareStatus(state)) return state;
    return {
        isAppSharing: state.isAppSharing,
        isShareInitiator: false,
    };
}

function isShareStatus(value: any): value is ISharingStatus {
    if (typeof value !== "object") return false;
    if (typeof value.isAppSharing !== "boolean") return false;
    return (
        typeof value.isShareInitiator === "boolean" ||
        value.isShareInitiator === undefined
    );
}

// In localhost, we will default to isShareInitiator == true, but can override with isShareInitiator search param.
function getSimulatedIsShareInitiator(): boolean {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("isShareInitiator");
    return param !== null ? param === "true" : true;
}

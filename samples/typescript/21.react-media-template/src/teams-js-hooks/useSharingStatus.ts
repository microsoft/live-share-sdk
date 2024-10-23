import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState, useRef } from "react";

export const useSharingStatus = (context?: microsoftTeams.app.Context) => {
    const [sharingActive, setSharingActive] = useState(false);
    const intervalIdRef = useRef<any>();

    useEffect(() => {
        if (!intervalIdRef.current) {
            // Mobile does not yet support getAppContentStageSharingState API.
            // TODO: Filter out this API in mobile until its supported.
            const clientType = context?.app?.host?.clientType;
            const apiIsSupported =
                clientType &&
                ![
                    microsoftTeams.HostClientType.web,
                    microsoftTeams.HostClientType.desktop,
                ].includes(clientType);
            if (
                !apiIsSupported &&
                microsoftTeams.meeting &&
                context?.page?.frameContext ===
                    microsoftTeams.FrameContexts.sidePanel
            ) {
                const setAppSharingStatus = () => {
                    microsoftTeams.meeting.getAppContentStageSharingCapabilities(
                        (capabilitiesError, result) => {
                            if (
                                !capabilitiesError &&
                                result?.doesAppHaveSharePermission
                            ) {
                                microsoftTeams.meeting.getAppContentStageSharingState(
                                    (_, state) => {
                                        if (state) {
                                            setSharingActive(
                                                state.isAppSharing
                                            );
                                        } else {
                                            setSharingActive(false);
                                        }
                                    }
                                );
                            } else {
                                setSharingActive(false);
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
    }, [context, setSharingActive, intervalIdRef]);

    return sharingActive;
};

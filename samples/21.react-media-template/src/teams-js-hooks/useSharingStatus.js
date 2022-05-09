import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState, useRef } from "react";

export const useSharingStatus = (context) => {
  const [sharingActive, setSharingActive] = useState(false);

  const intervalIdRef = useRef();

  useEffect(() => {
    if (!intervalIdRef.current) {
      // Mobile does not yet support getAppContentStageSharingState API.
      // TODO: Filter out this API in mobile until its supported.
      const apiIsSupported = ![
        microsoftTeams.HostClientType.web,
        microsoftTeams.HostClientType.desktop,
      ].includes(context?.app?.host?.clientType);
      if (
        !apiIsSupported &&
        microsoftTeams.meeting &&
        context.page?.frameContext === microsoftTeams.FrameContexts.sidePanel
      ) {
        const setAppSharingStatus = () => {
          microsoftTeams.meeting.getAppContentStageSharingCapabilities(
            (capabilitiesError, result) => {
              if (!capabilitiesError && result?.doesAppHaveSharePermission) {
                microsoftTeams.meeting.getAppContentStageSharingState(
                  (_, state) => {
                    setSharingActive(state.isAppSharing);
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
    return () => clearInterval(intervalIdRef.current);
  }, [context, setSharingActive, intervalIdRef]);

  return sharingActive;
};

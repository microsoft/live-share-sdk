/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { app } from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { inTeams } from "../utils/inTeams";

export const useTeamsContext = () => {
    const [ctx, setCtx] = useState<app.Context>();

    useEffect(() => {
        if (!ctx?.user?.id) {
            // Add inTeams=true to URL params to get real Teams context
            if (inTeams()) {
                console.log("useTeamsContext: Attempting to get Teams context");
                // Get Context from the Microsoft Teams SDK
                microsoftTeams.app
                    .getContext()
                    .then((context) => {
                        console.log(
                            `useTeamsContext: received context: ${JSON.stringify(
                                context
                            )}`
                        );
                        setCtx(context);
                    })
                    .catch((error) => console.error(error));
            } else {
                console.log("useTeamsContext: Creating fake Teams context");
                setCtx(createFakeContext());
            }
        }
    }, [ctx?.user?.id]);

    return ctx;
};

const createFakeContext = () => {
    const fakeHost: app.AppHostInfo = {
        name: microsoftTeams.HostName.teams,
        clientType: microsoftTeams.HostClientType.web,
        sessionId: "",
    };

    const fakeAppInfo: app.AppInfo = {
        locale: "",
        theme: "",
        sessionId: "",
        host: fakeHost,
    };

    const fakePageInfo: app.PageInfo = {
        id: "",
        frameContext: microsoftTeams.FrameContexts.meetingStage,
    };

    const fakeUserInfo: app.UserInfo = {
        id: `user${Math.abs(Math.random() * 999999999)}`,
    };

    const fakeContext: app.Context = {
        app: fakeAppInfo,
        page: fakePageInfo,
        user: fakeUserInfo,
    };

    return fakeContext;
};

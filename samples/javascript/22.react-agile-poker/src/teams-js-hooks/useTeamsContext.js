/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useRef, useState } from "react";
import { inTeams } from "../utils/inTeams";

export const useTeamsContext = () => {
    const startedRef = useRef(false);
    const [ctx, setCtx] = useState(null);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
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
                // Simulate Teams userObjectId for browser testing
                setCtx({
                    user: {
                        id: `user${Math.abs(Math.random() * 999999999)}`,
                    },
                });
            }
        }
    }, [ctx?.user?.id]);

    return ctx;
};

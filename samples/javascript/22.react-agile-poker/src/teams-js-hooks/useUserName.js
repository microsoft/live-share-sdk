/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useRef, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";

export const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
        return null;
    }
};

export const useUserName = () => {
    const startedRef = useRef(false);
    const [userName, setUserName] = useState(null);
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        // Authenticate if auth object is null or there was an error
        if (!userName) {
            console.info("Attempting to get Teams auth token");
            if (inTeams()) {
                setUserName("Anonymous");
                // Get the Teams token using the Teams SDK
                microsoftTeams.authentication.getAuthToken({
                    successCallback: (result) => {
                        console.info("Successfully got Teams token");
                        const parsedClaim = parseJwt(result);
                        setUserName(parsedClaim?.name || "Anonymous");
                    },
                    failureCallback: (error) => {
                        console.error("Error getting Teams token", error);
                        setUserName("Unknown User");
                    },
                });
            } else {
                setUserName("Anonymous");
            }
        }
    }, [userName]);

    return userName;
};

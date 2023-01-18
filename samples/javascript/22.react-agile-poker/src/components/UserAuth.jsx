/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useCallback, useEffect, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import { Button } from "@fluentui/react-components";
import { getRandomAvatar } from "../utils/random-avatar";

const HAS_AUTH_LOCAL_STORAGE_KEY = "poker-user-has-auth";

export const UserAuth = ({ onLogIn }) => {
    const [error, setError] = useState();
    const [data, setData] = useState();
    const [loading, setLoading] = useState(false);

    const login = useCallback(async () => {
        setLoading(true);
        try {
            const result = await microsoftTeams.authentication.getAuthToken();
            const parsedClaim = parseJwt(result);
            if (parsedClaim?.name) {
                setData({
                    name: parsedClaim.name,
                });
                setLoading(false);
                localStorage.setItem(HAS_AUTH_LOCAL_STORAGE_KEY, "true");
            } else {
                setError(`No name found after completing log in.`);
            }
        } catch (error) {
            // In cases where the getAuthToken API fails, we mark the user as anonymous.
            console.error(error);
            setData({
                name: getRandomAvatar().name,
            });
        }
    }, [setLoading, setData]);

    useEffect(() => {
        try {
            const hasAuth = localStorage.getItem(HAS_AUTH_LOCAL_STORAGE_KEY) === "true";
            if (hasAuth) {
                login();
            }
        } catch (error) {
            // For users that have disabled local storage user support, we set name to anonymous
            console.error(error);
            setData({
                name: getRandomAvatar().name,
            });
        }
    }, [login]);

    useEffect(() => {
        if (data) {
            onLogIn(data.name);
        }
    }, [data, onLogIn]);

    return (
        <div>
            {!data && (
                <Button appearance="subtle" disabled={loading} onClick={login}>
                    Log in
                </Button>
            )}
            {loading && error && <div>Loading...</div>}
            {!loading && error && (
                <div>
                    Failed to read your profile. Please try again later. <br />{" "}
                    Details: {error.toString()}
                </div>
            )}
        </div>
    );
};

export const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
        return null;
    }
};

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useCallback, useEffect, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import { Button } from "@fluentui/react-components";

export const UserAuth = ({ onLogIn }) => {
    const [error, setError] = useState();
    const [data, setData] = useState();
    const [loading, setLoading] = useState(false);

    const login = useCallback(() => {
        setLoading(true);
        microsoftTeams.authentication.getAuthToken({
            successCallback: (result) => {
                const parsedClaim = parseJwt(result);
                if (parsedClaim?.name) {
                    setData({
                        name: parsedClaim?.name || "Anonymous",
                    });
                    setLoading(false);
                    localStorage.setItem("poker-user-has-auth", "true");
                } else {
                    setError(`No name found after completing log in.`);
                }
            },
            failureCallback: (error) => {
                setError(`Error getting user token ${error}`);
            },
        });
    }, [setLoading, setData]);

    useEffect(() => {
        const hasAuth = localStorage.getItem("poker-user-has-auth") === "true";
        if (hasAuth) {
            login();
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

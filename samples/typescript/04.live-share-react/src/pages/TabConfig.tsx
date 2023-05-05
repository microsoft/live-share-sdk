import { pages } from "@microsoft/teams-js";
import { ChangeEventHandler, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AppRoutes } from "../constants";
import { inTeams } from "../utils/inTeams";

const IN_TEAMS = inTeams();

export const TabConfig = () => {
    const [selectedRoute, setSelectedRoute] = useState<string | undefined>(undefined);
    const navigate = useNavigate();

    // Radio button change callback
    const onSelectedRouteChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        setSelectedRoute(e.currentTarget.value);
    }

    // When not in Teams, we show a "GO" button to navigate to the selected route
    const onNavigate = () => {
        if (!selectedRoute) return;
        navigate({
            pathname: selectedRoute,
            search: `?inTeams=false`,
        });
    }

    // When selectedRoute is changed, update our registerOnSaveHandler while IN_TEAMS is true
    useEffect(() => {
        if (!IN_TEAMS) return;
        pages.config.registerOnSaveHandler(function (saveEvent) {
            pages.config.setConfig({
                suggestedDisplayName: "Live Share React",
                contentUrl: `${window.location.origin}${selectedRoute}?inTeams=true`,
            });
            saveEvent.notifySuccess();
        });
        // Update the "Save" button in Teams to be enabled if selected route is known, otherwise disable
        pages.config.setValidityState(!!selectedRoute);
    }, [selectedRoute]);

    return (
        <div>
            <h1>
                {"Welcome to the Live Share React sample!"}
            </h1>
            <div>
                <input
                    type="radio"
                    name="Live Share Auto Join"
                    value={AppRoutes.LiveShareAutoJoin}
                    checked={selectedRoute === AppRoutes.LiveShareAutoJoin}
                    onChange={onSelectedRouteChange}
                />
                {"Live Share Auto Join"}
            </div>
            <div>
                <input
                    type="radio"
                    name="Live Share Manual Join"
                    value={AppRoutes.LiveShareManualJoin}
                    checked={selectedRoute === AppRoutes.LiveShareManualJoin}
                    onChange={onSelectedRouteChange}
                />
                {"Live Share Manual Join"}
            </div>
            <div>
                <input
                    type="radio"
                    name="Azure Auto Join"
                    value={AppRoutes.AzureAutoJoin}
                    checked={selectedRoute === AppRoutes.AzureAutoJoin}
                    onChange={onSelectedRouteChange}
                />
                {"Azure Auto Join"}
            </div>
            { !IN_TEAMS && (
                <button onClick={onNavigate}>
                    {"GO"}
                </button>
            )}
        </div>
    )
}
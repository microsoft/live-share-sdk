import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { inTeams } from "./utils/inTeams";
import { useRef, useEffect, useState } from "react";
import { AzureAutoJoin, LiveShareAutoJoin, LiveShareManualJoin, TabConfig } from "./pages";
import { AppRoutes } from "./constants";

const IN_TEAMS = inTeams();

export default function App() {
    const initializeStartedRef = useRef(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // In production, you might consider using React Suspense if you are using React V18.
        // We are not doing this here because many customers are still using React V17.
        // We are monitoring the React Suspense situation closely and may revisit in the future.
        if (initializeStartedRef.current || !IN_TEAMS) return;
        initializeStartedRef.current = true;
        const initialize = async () => {
            try {
                console.log("App.js: initializing client SDK initialized");
                await microsoftTeams.app.initialize();
                microsoftTeams.app.notifyAppLoaded();
                microsoftTeams.app.notifySuccess();
                setInitialized(true);
            } catch (error) {
                console.error(error);
            }
        };
        console.log("App.js: initializing client SDK");
        initialize();
    }, []);

    const appReady = (IN_TEAMS && initialized) || !IN_TEAMS;

    return (
        <>
            {appReady && (
                <Router window={window} basename="/">
                    <Routes>
                        {/* Default route. In Teams, this will save the tab configuration for one of the below routes. Otherwise, we redirect to selected route. */}
                        <Route exact path={AppRoutes.TabConfig} element={<TabConfig />} />
                        {/* Example for automatically joining Live Share container when this component is rendered */}
                        <Route exact path={AppRoutes.LiveShareAutoJoin} element={<LiveShareAutoJoin />} />
                        {/* Example for manually joining Live Share session based on a user action */}
                        <Route exact path={AppRoutes.LiveShareManualJoin} element={<LiveShareManualJoin />} />
                        {/* Example for automatically creating or joining AzureClient container when this component is rendered */}
                        <Route exact path={AppRoutes.AzureAutoJoin} element={<AzureAutoJoin />} />
                    </Routes>
                </Router>
            )}
        </>
    );
}

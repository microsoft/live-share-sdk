import { FC, ReactNode, useRef } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { app } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";

interface ITeamsClientLoaderProps {
    children: ReactNode;
}

export const TeamsClientLoader: FC<ITeamsClientLoaderProps> = ({
    children,
}) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error>();
    const loadingRef = useRef(false);
    useEffect(() => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        let mounted = true;
        const initialize = async () => {
            try {
                await app.initialize();
                if (mounted) {
                    setIsInitialized(true);
                }
            } catch (error: any) {
                console.error(error);
                if (mounted) {
                    setError(error);
                }
            }
        };
        if (inTeams()) {
            initialize();
        } else {
            setIsInitialized(true);
        }
        return () => {
            mounted = false;
        };
    }, []);

    if (!isInitialized) {
        return <div>{"Loading"}</div>;
    }
    if (error) {
        return <div>{error.message}</div>;
    }
    return <>{ children }</>;
};

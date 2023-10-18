import { liveShare } from "@microsoft/teams-js";

export function isLiveShareSupported(): boolean {
    try {
        // Teams JS currently throws an error if not in meetingStage / sidePanel frame contexts.
        // This will be fixed in a future update.
        const isSupported = liveShare.isSupported();
        return isSupported;
    } catch {
        return false;
    }
}

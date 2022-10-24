import { UserMeetingRole } from "@microsoft/live-share";

// Choose roles that can control playback (e.g., pause/play)
// If empty or undefined, all users can control playback
export const ACCEPT_PLAYBACK_CHANGES_FROM = [
    UserMeetingRole.presenter,
    UserMeetingRole.organizer,
];

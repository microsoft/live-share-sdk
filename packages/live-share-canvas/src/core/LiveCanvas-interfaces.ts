/**
 * Encapsulates information about a user that is okay to be sent through events.
 */
export interface IEventUserInfo {
    /**
     * Optional. The URI to the user's picture.
     */
    pictureUri?: string;
}

/**
 * Encapsulates information about a user.
 */
export interface IUserInfo extends IEventUserInfo {
    /**
     * Optional. The user's display name.
     */
    displayName?: string;
}

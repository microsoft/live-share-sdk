/**
 * @hidden
 * Use for operations that are blocked due to the metadata not being set.
 */
export class TrackMetadataNotSetError extends Error {
    constructor(prefix: string, callingFunction: string) {
        super(
            `${prefix} -  called before playback track metadata has been assigned.\nTo fix this error, ensure \`setTrack()\` has been called with the track information before calling \`${callingFunction}()\``
        );
    }

    static assert(
        condition: boolean,
        prefix: string,
        callingFunction: string
    ): asserts condition {
        if (condition) return;
        throw new TrackMetadataNotSetError(prefix, callingFunction);
    }
}

/**
 * @hidden
 * Use for operations that are blocked due to the metadata not being set.
 */
export class ActionBlockedError extends Error {
    constructor(prefix: string, callingFunction: string, settingName: string) {
        super(
            `${prefix} - operation blocked due to \`${settingName}\` being set to false.\nTo fix this error, ensure \`${settingName}\` is true before calling \`${callingFunction}()\`, or set \`${settingName}\` to true. If you are using \`MediaPlayerSynchronizer\`, you can instead use the \`viewOnly\`, which when set to false, it will set \`${settingName}\` value to true.`
        );
    }

    static assert(
        condition: boolean,
        prefix: string,
        callingFunction: string,
        settingName: string
    ): asserts condition {
        if (condition) return;
        throw new ActionBlockedError(prefix, callingFunction, settingName);
    }
}

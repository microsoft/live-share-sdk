/**
 * @hidden
 */
class UseLiveDataObjectActionError extends Error {
    constructor(ddsName: string, functionName: string, message: string) {
        const hookName = `use${toFirstLetterUppercase(ddsName)}`;
        super(`${hookName} ${functionName}: ${message}`);
    }
}

/**
 * @hidden
 */
export class ActionContainerNotJoinedError extends UseLiveDataObjectActionError {
    constructor(ddsName: string, functionName: string) {
        super(
            ddsName,
            functionName,
            "container has not yet been joined.\nTo fix this error, ensure `container` from `useFluidObjectsContext()` is defined before calling this function.\nIf using `<LiveShareProvider>`, you can instead check the `joined` response is true from `useLiveShareContext()` before calling this function."
        );
    }
}

/**
 * @hidden
 */
export class ActionLiveDataObjectUndefinedError extends UseLiveDataObjectActionError {
    constructor(ddsName: string, functionName: string) {
        const hookName = `use${toFirstLetterUppercase(ddsName)}`;
        super(
            ddsName,
            functionName,
            `${ddsName} is undefined, which means it is still being dynamically created.\nTo fix this error, ensure that \`${ddsName}\` (found in the response of \`${hookName}\`) is defined before calling this function.`
        );
    }
}

/**
 * @hidden
 */
export class ActionLiveDataObjectInitializedError extends UseLiveDataObjectActionError {
    constructor(ddsName: string, functionName: string) {
        const hookName = `use${toFirstLetterUppercase(ddsName)}`;
        super(
            ddsName,
            functionName,
            `${ddsName} is not yet initialized.\nTo fix this error, ensure that \`${ddsName}?.isInitialized\` is true (found in the response of \`${hookName}\`) before calling this function.`
        );
    }
}

/**
 * @hidden
 */
export interface ITeamsJsSdkError {
    /**
     * error code
     */
    errorCode: number;
    /**
     * Optional description for the error. This may contain useful information for web-app developers.
     * This string will not be localized and is not for end-user consumption.
     * App should not depend on the string content. The exact value may change. This is only for debugging purposes.
     */
    message?: string;
}

/**
 * @hidden
 */
function toFirstLetterUppercase(word: string) {
    return word[0].toUpperCase() + word.substring(1);
}

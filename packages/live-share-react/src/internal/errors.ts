/**
 * @hidden
 */
class UseLiveDataObjectActionError extends Error {
    constructor(ddsName: string, functionName: string, message: string) {
        super(
            `use${toFirstLetterUppercase(ddsName)} ${functionName}: ${message}`
        );
    }
}

/**
 * @hidden
 */
export class ActionContainerNotJoinedError extends UseLiveDataObjectActionError {
    constructor(ddsName: string, functionName: string) {
        super(ddsName, functionName, "container has not yet been joined");
    }
}

/**
 * @hidden
 */
export class ActionLiveDataObjectUndefinedError extends UseLiveDataObjectActionError {
    constructor(ddsName: string, functionName: string) {
        super(
            ddsName,
            functionName,
            `${ddsName} is undefined, which means it is still being dynamically created`
        );
    }
}

/**
 * @hidden
 */
export class ActionLiveDataObjectInitializedError extends UseLiveDataObjectActionError {
    constructor(ddsName: string, functionName: string) {
        super(ddsName, functionName, `${ddsName} is not initialized`);
    }
}

/**
 * @hidden
 */
function toFirstLetterUppercase(word: string) {
    return word[0].toUpperCase() + word.substring(1);
}

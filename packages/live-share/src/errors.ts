import { LiveShareReportIssueLink } from "./internals";
import { LiveDataObjectInitializeState } from "./interfaces";

/**
 * @hidden
 * Use for errors that are unexpected.
 */
export class UnexpectedError extends Error {
    constructor(prefix: string, message: string) {
        super(
            `${prefix} - ${message}\nPlease report this issue at ${LiveShareReportIssueLink}.`
        );
    }

    static assert(
        condition: boolean,
        prefix: string,
        message: string
    ): asserts condition {
        if (condition) return;
        throw new UnexpectedError(prefix, message);
    }
}

/**
 * @hidden
 * Use for functions in `LiveDataObject` inherited classes that expect `initializeState` to be succeeded.
 */
export class LiveDataObjectNotInitializedError extends Error {
    constructor(
        prefix: string,
        callerName: string,
        initializeState: LiveDataObjectInitializeState
    ) {
        super(
            `${prefix} - not initialized prior to calling \`${callerName}()\`. \`initializeState\` is \`${initializeState}\` but must equal \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
        );
    }

    static assert(
        prefix: string,
        callerName: string,
        initializeState: LiveDataObjectInitializeState
    ) {
        if (initializeState === LiveDataObjectInitializeState.succeeded) return;
        throw new LiveDataObjectNotInitializedError(
            prefix,
            callerName,
            initializeState
        );
    }
}

/**
 * @hidden
 * Use for `.initialize()` functions in `LiveDataObject` inherited classes when initialize was already called.
 */
export class LiveDataObjectInitializeNotNeededError extends Error {
    constructor(
        prefix: string,
        initializeState: LiveDataObjectInitializeState
    ) {
        super(
            `${prefix} -  initialization is not needed. \`initializeState\` is \`${initializeState}\` but must equal \`needed\`.\nTo fix this error, ensure you only call \`.initialize()\` when \`initializeState\` equals \`needed\`.`
        );
    }

    static assert(
        prefix: string,
        initializeState: LiveDataObjectInitializeState
    ) {
        if (initializeState === LiveDataObjectInitializeState.needed) return;
        throw new LiveDataObjectInitializeNotNeededError(
            prefix,
            initializeState
        );
    }
}

/**
 * @hidden
 * Use for generic expected errors. Use to get standard formatting of errors.
 */
export class ExpectedError extends Error {
    constructor(prefix: string, message: string, helpText: string) {
        super(
            `${prefix} - ${message}.\n${helpText}\nIf you think you received this error by mistake, report an issue at ${LiveShareReportIssueLink}.`
        );
    }

    static assert(
        condition: boolean,
        prefix: string,
        message: string,
        helpText: string
    ): asserts condition {
        if (condition) return;
        throw new ExpectedError(prefix, message, helpText);
    }
}

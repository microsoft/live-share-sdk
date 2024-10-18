import { ITeamsJsSdkError } from "./errors.js";

/**
 * @hidden
 * Used for useLiveState and useSharedState for checking if a value is a prevState callback
 */
export function isPrevStateCallback<TState>(
    value: any
): value is (value: TState) => TState {
    return typeof value === "function";
}

/**
 * @hidden
 */
export function isITeamsJsSdkError(value: any): value is ITeamsJsSdkError {
    if (!value) return false;
    if (typeof value.errorCode !== "number") return false;
    if (value.message === undefined) return true;
    return typeof value.message === "string";
}

/**
 * @hidden
 * Used for useLiveState and useSharedState for checking if a value is a prevState callback
 */
export function isPrevStateCallback<TState>(
    value: any
): value is (value: TState) => TState {
    return typeof value === "function";
}

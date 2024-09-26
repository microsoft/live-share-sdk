export interface IAppConfiguration {
    /**
     * Flag to fully optimize for large meetings, including disabling background updates for non-leaders.
     */
    isFullyLargeMeetingOptimized: boolean;
}
export const AppConfiguration: IAppConfiguration = {
    // Set to false to disable large meeting optimizations
    isFullyLargeMeetingOptimized: true,
};

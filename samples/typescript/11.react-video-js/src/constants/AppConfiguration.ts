export interface IAppConfiguration {
    /**
     * Flag to fully optimize for large meetings, including disabling background updates for non-leaders.
     */
    isFullyLargeMeetingOptimized: boolean;
}
export const AppConfiguration: IAppConfiguration = {
    isFullyLargeMeetingOptimized: true,
};

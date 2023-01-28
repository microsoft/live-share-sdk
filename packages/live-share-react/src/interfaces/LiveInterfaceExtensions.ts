export interface IReceiveLiveEvent<TEvent extends object = object> {
    event: TEvent;
    local: boolean;
}

import {
    IAddPointsEventArgs,
    IBeginStrokeEventArgs,
    IPointerMovedEventArgs,
} from "../InkingManager-interfaces";
import { IEventUserInfo } from "../LiveCanvas-interfaces";
import { ISharedCursor } from "./LiveCanvas-interfaces-internal";

export type IBeginWetStrokeEvent = IBeginStrokeEventArgs &
    ISharedCursor &
    IEventUserInfo;

export type IAddWetStrokePointsEvent = IAddPointsEventArgs &
    ISharedCursor &
    IEventUserInfo;

export type IPointerMovedEvent = IPointerMovedEventArgs & IEventUserInfo;

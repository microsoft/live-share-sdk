import {
    IAddPointsEventArgs,
    IBeginStrokeEventArgs,
    IPointerMovedEventArgs,
} from "../InkingManager-interfaces.js";
import { IEventUserInfo } from "../LiveCanvas-interfaces.js";
import { ISharedCursor } from "./LiveCanvas-interfaces-internal.js";

export type IBeginWetStrokeEvent = IBeginStrokeEventArgs &
    ISharedCursor &
    IEventUserInfo;

export type IAddWetStrokePointsEvent = IAddPointsEventArgs &
    ISharedCursor &
    IEventUserInfo;

export type IPointerMovedEvent = IPointerMovedEventArgs & IEventUserInfo;

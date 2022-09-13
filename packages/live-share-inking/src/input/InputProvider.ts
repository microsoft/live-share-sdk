/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IPointerPoint } from "../core";

/**
 * Represents a pointer event such as up, down or enter.
 */
export interface IPointerEvent extends IPointerPoint {
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
}

/**
 * Representes a a pointer move event.
 */
export interface IPointerMoveEvent extends IPointerEvent {
    isPointerDown: boolean;
}

/**
 * Defines a typed callback function used by multicast events.
 */
export type EventListener<TArgs> = (args: TArgs) => void;

/**
 * Defines a typed multicast event, i.e. an event that
 * can have multiple listeners. 
 */
export interface IMulticastEvent<TArgs> {
    on(listener: EventListener<TArgs>): void;
    off(listener: EventListener<TArgs>): void;
}

/**
 * Implements a simple typed multicast event.
 */
export class MulticastEvent<TArgs> {
    private _listeners = new Set<EventListener<TArgs>>;

    on(listener: EventListener<TArgs>) {
        if (!this._listeners.has(listener)) {
            this._listeners.add(listener);
        }
    }

    off(listener: EventListener<TArgs>) {
        this._listeners.delete(listener);
    }

    emit(args: TArgs) {
        for (const listener of this._listeners) {
            listener(args);
        }
    }
}

/**
 * A basic input event provider implementation.
 */
export abstract class InputProvider {
    protected readonly pointerDownEvent = new MulticastEvent<IPointerEvent>();
    protected readonly pointerMoveEvent = new MulticastEvent<IPointerMoveEvent>();
    protected readonly pointerUpEvent = new MulticastEvent<IPointerEvent>();
    protected readonly pointerEnterEvent = new MulticastEvent<IPointerEvent>();
    protected readonly pointerLeaveEvent = new MulticastEvent<IPointerEvent>();

    private _isActive: boolean = true;

    activate() {
        this._isActive = true;
    }

    deactivate() {
        this._isActive = false;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    get pointerDown(): IMulticastEvent<IPointerEvent> {
        return this.pointerDownEvent;
    }

    get pointerMove(): IMulticastEvent<IPointerMoveEvent> {
        return this.pointerMoveEvent;
    }

    get pointerUp(): IMulticastEvent<IPointerEvent> {
        return this.pointerUpEvent;
    }

    get pointerEnter(): IMulticastEvent<IPointerEvent> {
        return this.pointerEnterEvent;
    }

    get pointerLeave(): IMulticastEvent<IPointerEvent> {
        return this.pointerLeaveEvent;
    }
}
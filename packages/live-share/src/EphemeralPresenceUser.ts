/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EphemeralEvent } from './EphemeralEvent';
import { IEphemeralEvent , UserMeetingRole} from './interfaces';
import { TimeInterval } from './TimeInterval';
import { cloneValue } from './internals';

/**
 * List of possible presence states.
 */
export enum PresenceState {
    /**
     * The user is online. Default state while user has at least one client connected.
     */
    online = 'online',

    /**
     * The user is away. Applications can set this state based on the users activity.
     */
    away = 'away',

    /**
     * The user is offline. Automatically set for users after their client has stopped sending 
     * updates for a period of time.
     */
    offline = 'offline'
}

/**
 * @hidden
 */
export interface IEphemeralPresenceEvent<TData = object> extends IEphemeralEvent {
    userId: string;
    state: PresenceState;
    data?: TData;
}

/**
 * A use that presence is being tracked for.
 */
export class EphemeralPresenceUser<TData = object> {
    /**
     * @hidden
     */
    constructor(private _evt: IEphemeralPresenceEvent<TData>, private _expirationPeriod: TimeInterval, private _isLocalUser: boolean) {}
    
    /**
     * If `true` the user is the local user.
     */
    public get isLocalUser(): boolean {
        return this._isLocalUser;
    }

    /**
     * ID of the user.
     */
    public get userId(): string {
        return this._evt.userId;
    }

    /**
     * Users current state.
     * 
     * #### remarks
     * This is automatically set to [[PresenceState.offline]] if the users client hasn't sent updates 
     * for a period of time.
     */
    public get state(): PresenceState {
        return this.hasExpired() ? PresenceState.offline : this._evt.state;
    }

    /**
     * Optional data shared by the user.
     */
    public get data(): TData|undefined {
        return cloneValue(this._evt.data);
    }

    /**
     * Returns the users meeting roles.
     */
    public getRoles(): Promise<UserMeetingRole[]> {
        return EphemeralEvent.getClientRoles(this._evt.clientId!);
    }

    /**
     * @hidden
     */
    public updateReceived(evt: IEphemeralPresenceEvent<TData>): boolean {
        const current = this._evt;
        if (EphemeralEvent.isNewer(current, evt)) {
            // Save updated event
            this._evt = evt;

            // Has anything changed?
            if (evt.state != current.state || JSON.stringify(evt.data) != JSON.stringify(current.data)) {
                return true;
            }
        }
            
        return false;
    }

    private hasExpired(): boolean {
        const now = EphemeralEvent.getTimestamp();
        const elapsed = now - this._evt.timestamp;
        return (elapsed > (this._expirationPeriod.milliseconds * 2));
    }
}

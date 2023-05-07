/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { AzureContainerServices } from "@fluidframework/azure-client";
import { IFluidContainer } from "fluid-framework";
import { LiveShareRuntime } from "./LiveShareRuntime";

/**
 * Base interface for all event objects.
 */
export interface IEvent {
    /**
     * Additional event properties.
     */
    [key: string]: any;

    /**
     * Name of the event.
     */
    name: string;
}

/**
 * Base interface for all client timestamp comparisons.
 */
export interface IClientTimestamp {
    /**
     * Current client ID, if known. The client ID will be `undefined` if the client is currently disconnected.
     */
    clientId?: string;

    /**
     * Global timestamp of when the event was sent.
     */
    timestamp: number;
}

/**
 * Base interface for all live share events.
 */
export interface ILiveEvent extends IEvent, IClientTimestamp {}

/**
 * Removes the base properties from an event that derives from `ILiveEvent`.
 * @template TEvent Type of event.
 */
export type OutgoingLiveEvent<TEvent extends ILiveEvent> = Omit<
    TEvent,
    "name" | "clientId" | "timestamp"
>;

/**
 * Allowed roles during a meeting.
 */
export enum UserMeetingRole {
    /**
     * The user is an external guest user.
     */
    guest = "Guest",

    /**
     * The user is a standard meeting attendee.
     */
    attendee = "Attendee",

    /**
     * The user has presenter privileges for the meeting.
     */
    presenter = "Presenter",

    /**
     * The user is a meeting organizer.
     */
    organizer = "Organizer",
}

/**
 * @hidden
 * A provider that generates timestamps.
 */
export interface ITimestampProvider {
    /**
     * Returns the current timestamp as the number of milliseconds sine the Unix Epoch.
     */
    getTimestamp(): number;

    /**
     * Returns the maximum number of milliseconds a returned timestamp can be off from the source.
     */
    getMaxTimestampError(): number;
}

/**
 * @hidden
 * A provider that verifies roles.
 */
export interface IRoleVerifier {
    /**
     * Verifies that a client has one of the specified roles.
     * @param clientId Client ID to inspect.
     * @param allowedRoles User roles that are allowed.
     * @returns True if the client has one of the specified roles.
     */
    verifyRolesAllowed(
        clientId: string,
        allowedRoles: UserMeetingRole[]
    ): Promise<boolean>;
}

/**
 * State of the current Live Share sessions backing fluid container.
 */
export enum ContainerState {
    /**
     * The call to `LiveShareHost.setContainerId()` successfully created the container mapping
     * for the current Live Share session.
     */
    added = "Added",

    /**
     * A container mapping for the current Live Share Session already exists and should be used
     * when joining the sessions Fluid container.
     */
    alreadyExists = "AlreadyExists",

    /**
     * The call to `LiveShareHost.setContainerId()` failed to create the container mapping due to
     * another client having already set the container ID for the current Live Share session.
     */
    conflict = "Conflict",

    /**
     * A container mapping for the current Live Share session doesn't exist yet.
     */
    notFound = "NotFound",
}

/**
 * Returned from `LiveShareHost.get/setFluidContainerId()` to specify the container mapping for the
 * current Live Share session.
 */
export interface IFluidContainerInfo {
    /**
     * State of the containerId mapping.
     */
    containerState: ContainerState;

    /**
     * ID of the container to join for the meeting. Undefined if the container hasn't been
     * created yet.
     */
    containerId: string | undefined;

    /**
     * If true, the local client should create the container and then save the created containers
     * ID to the mapping service.
     */
    shouldCreate: boolean;

    /**
     * If `containerId` is undefined and `shouldCreate` is false, the container isn't ready but
     * another client is creating it. The local client should wait the specified amount of time and
     * then ask for the container info again.
     */
    retryAfter: number;
}

/**
 * Returned from `LiveShareHost.getNtpTime()` to specify the global timestamp for the current
 * Live Share session.
 */
export interface INtpTimeInfo {
    /**
     * ISO 8601 formatted server time. For example: '2019-09-07T15:50-04:00'
     */
    ntpTime: string;

    /**
     * Server time expressed as the number of milliseconds since the ECMAScript epoch.
     */
    ntpTimeInUTC: number;
}

/**
 * Returned from `LiveShareHost.getFluidTenantInfo()` to specify the Fluid service to use for the
 * current Live Share session.
 */
export interface IFluidTenantInfo {
    /**
     * The Fluid Tenant ID Live Share should use.
     */
    tenantId: string;

    /**
     * The Fluid service endpoint Live Share should use.
     */
    serviceEndpoint: string;
}

/**
 * Returned from `LiveShareHost.getClientInfo()` to specify the user information for a given `clientId`.
 * Each user individually requests this data for each other user in the session, making it secure & trusted.
 */
export interface IClientInfo {
    /**
     * The user identifier that corresponds to the provided client identifier.
     */
    userId: string;
    /**
     * List of roles of the user.
     */
    roles: UserMeetingRole[];
    /**
     * Optional. The display name for the user.
     */
    displayName?: string;
}

/**
 * Interface for hosting a Live Share session within a client like Teams.
 */
export interface ILiveShareHost {
    /**
     * Returns the Fluid service endpoint and tenant to use for the current session.
     */
    getFluidTenantInfo(): Promise<IFluidTenantInfo>;

    /**
     * Returns the Fluid access token to use for the current session.
     * @param containerId Optional. ID of the container being joined. This will be undefined when creating a new container.
     */
    getFluidToken(containerId?: string): Promise<string>;

    /**
     * Returns the container mapping information for the current session.
     *
     * @remarks
     * Hosts are required to implement a container mapping service that stores the container ID for
     * the current session.
     *
     * TODO: add creation protocol details
     */
    getFluidContainerId(): Promise<IFluidContainerInfo>;

    /**
     * Attempts to save the ID of the Fluid container created to the hosts mapping service.
     *
     * @remarks
     * Hosts should return a `containerState` of "Added" if the mapping was successfully saved,
     * otherwise a state of "Conflict" should be returned to indicate that another client has
     * already saved a container ID for the current session.
     * @param containerId Id of the Fluid container that was created.
     * @returns Information indicating the success of mapping assignment.
     */
    setFluidContainerId(containerId: string): Promise<IFluidContainerInfo>;

    /**
     * Returns the global timestamp for the current session.
     */
    getNtpTime(): Promise<INtpTimeInfo>;

    /**
     * Registers the local clients Fluid client ID with the hosts role verification service.
     *
     * @remarks
     * Hosts should expect this to be called anytime the Fluid clients underlying socket connects
     * or reconnects.
     * @param clientId Unique ID assigned to the local Fluid client.
     * @returns An array of meeting roles assigned to the local user.
     */
    registerClientId(clientId: string): Promise<UserMeetingRole[]>;

    /**
     * @deprecated
     * Queries the hosts role verification service for the roles associated with a given client ID.
     * @param clientId ID of teh client to lookup.
     * @returns An array of roles assigned to the queried client ID.
     */
    getClientRoles(clientId: string): Promise<UserMeetingRole[] | undefined>;

    /**
     * Queries the hosts `IClientInfo` for a given client ID.
     * @param clientId ID of the client to lookup.
     * @returns `IUserInfo` for the queried client ID, or undefined if the client hasn't yet been registered
     */
    getClientInfo(clientId: string): Promise<IClientInfo | undefined>;
}

/**
 * Response object from `.joinContainer()` in `LiveShareClient`
 */
export interface ILiveShareJoinResults {
    /**
     * Fluid container
     */
    container: IFluidContainer;
    /**
     * Azure Container Services, which includes things like Fluid Audience
     */
    services: AzureContainerServices;
    /**
     * Live Share Runtime, which is used by DDS's to validate roles, synchronize clock, etc.
     * You can use this to get the server-side timestamp or stop the timestamp provider from running.
     */
    liveRuntime: LiveShareRuntime;
    /**
     * Whether the local user was the one to create the container
     */
    created: boolean;
}

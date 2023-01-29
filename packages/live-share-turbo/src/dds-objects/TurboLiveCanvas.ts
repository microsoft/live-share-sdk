import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";
import { InkingManager, IUserInfo, LiveCanvas, LiveCursor } from "@microsoft/live-share-canvas";
import { UserMeetingRole } from "@microsoft/live-share";

export class TurboLiveCanvas extends TurboDataObject<
    any,
    LiveCanvas
> {
    private _isInitialized: boolean = false;
    private _inkingManager?: InkingManager;

    constructor(dataObject: LiveCanvas) {
        const onDidOverrideDataObject = async () => {
            if (this._isInitialized && this._inkingManager) {
                this._inkingManager?.clear();
                this._inkingManager?.removeAllListeners();
                try {
                    await this.dataObject.initialize(this._inkingManager);
                } catch (error: any) {
                    console.error(error);
                }
            }
        };
        super(dataObject, [], onDidOverrideDataObject);
    }

    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Gets the current cursor sharing status of this client.
     */
    get isCursorShared(): boolean {
        return this.dataObject.isCursorShared;
    }

    /**
     * Sets the current cursor sharing status of this client.
     */
    set isCursorShared(value: boolean) {
        this.dataObject.isCursorShared = value;
    }

    /**
     * Gets the list of roles that are allowed to emit wet stroke events.
     */
    get allowedRoles(): UserMeetingRole[] {
        return this.dataObject.allowedRoles;
    }

    /**
     * Sets the list of roles that are allowed to emit wet stroke events.
     */
    set allowedRoles(value: UserMeetingRole[]) {
        this.dataObject.allowedRoles = value;
    }

    /**
     * Optional callback that allows the consuming application to provide a
     * friendly display name and/or a picture that will be used on remote devices
     * to render shared cursors.
     */
    public get onGetLocalUserInfo(): (() => IUserInfo | undefined) | undefined {
        return this.dataObject.onGetLocalUserInfo;
    }

    public set onGetLocalUserInfo(value: (() => IUserInfo | undefined) | undefined) {
        this.dataObject.onGetLocalUserInfo = value;
    }

    /**
     * Optional callback that allows the consuming application to provide its own
     * live cursor visual representation by extending the abstract `LiveCursor`
     * class. The callback is passed the user information retrieved via the
     * `onGetLocalUserInfo` calback, if provided.
     */
    public get onCreateLiveCursor(): ((clientId: string, userInfo?: IUserInfo) => LiveCursor) | undefined {
        return this.dataObject.onCreateLiveCursor;
    }

    public set onCreateLiveCursor(value: ((clientId: string, userInfo?: IUserInfo) => LiveCursor) | undefined) {
        this.dataObject.onCreateLiveCursor = value;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
    public async initialize(inkingManager: InkingManager): Promise<void> {
        await this.dataObject.initialize(inkingManager);
        this._inkingManager = inkingManager;
        this._isInitialized = true;
    }

    public static async create(
        turboClient: IFluidTurboClient,
        uniqueKey: string,
        onDidFirstInitialize?: (dds: TurboLiveCanvas) => void
    ): Promise<TurboLiveCanvas> {
        const results = await turboClient.getDDS<
            any,
            LiveCanvas
        >(
            `<LiveCanvas>:${uniqueKey}`,
            LiveCanvas,
            (dds: IFluidLoadable): TurboLiveCanvas => {
                return new TurboLiveCanvas(dds as LiveCanvas);
            },
        );
        const dds = results.dds as TurboLiveCanvas;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}

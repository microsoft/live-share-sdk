import { IEvent } from "@fluidframework/common-definitions";
import { TypedEventEmitter } from "@fluidframework/common-utils";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { ISharedObjectEvents } from "@fluidframework/shared-object-base";
import { SharedDataObject } from "../interfaces";

interface ITurboDataObject {
    get disposed(): boolean;
    get id(): string;
    dispose(): void;
}

export class TurboDataObject<
        I extends ISharedObjectEvents = ISharedObjectEvents,
        T extends SharedDataObject = SharedDataObject
    >
    extends TypedEventEmitter<I & IEvent>
    implements ITurboDataObject
{
    private _dataObject: T;
    private _eventNames: string[];
    private _onDidOverrideDataObject?: () => void;

    constructor(dataObject: T, eventNames: string[], onDidOverrideDataObject?: () => void) {
        super();
        this._dataObject = dataObject;
        this._eventNames = eventNames;
        this._onDidOverrideDataObject = onDidOverrideDataObject;
        this.setupEventListeners();
    }

    get disposed(): boolean {
        if ((this._dataObject as any).disposed !== undefined) {
            return (this._dataObject as any).disposed as boolean;
        }
        return false;
    }
    get id(): string {
        return this._dataObject.id;
    }
    /**
     * @hidden
     */
    set dataObject(value: T) {
        this._dataObject.removeAllListeners();
        (this._dataObject as any).dispose?.();
        this._dataObject = value;
        this.setupEventListeners();
        this._onDidOverrideDataObject?.();
    }
    /**
     * @hidden
     */
    get dataObject(): T {
        return this._dataObject;
    }

    // get IFluidRouter(): this {
    //     return this;
    // }
    get IFluidLoadable(): IFluidLoadable {
        return this._dataObject.IFluidLoadable;
    }
    // finishInitialization(existing: boolean): Promise<void> {
    //     throw new Error("Method not implemented.");
    // }
    // getFluidObjectFromDirectory<T extends IFluidLoadable>(key: string, directory: IDirectory, getObjectFromDirectory?: ((id: string, directory: IDirectory) => IFluidHandle<FluidObject<unknown> & IFluidLoadable> | undefined) | undefined): Promise<T | undefined> {
    //     throw new Error("Method not implemented.");
    // }
    // protected getService<T extends FluidObject<unknown>>(id: string): Promise<T> {
    //     throw new Error("Method not implemented.");
    // }
    // protected preInitialize(): Promise<void> {
    //     throw new Error("Method not implemented.");
    // }
    // protected initializingFirstTime(props?: I["InitialState"] | undefined): Promise<void> {
    //     throw new Error("Method not implemented.");
    // }
    // protected initializingFromExisting(): Promise<void> {
    //     throw new Error("Method not implemented.");
    // }
    // protected hasInitialized(): Promise<void> {
    //     throw new Error("Method not implemented.");
    // }

    dispose(): void {
        (this._dataObject as any).dispose?.();
    }

    private setupEventListeners() {
        this._eventNames.forEach((eventName) => {
            this._dataObject.on(eventName, (...args) => {
                this.emit(eventName, ...args);
            });
        });
    }
}

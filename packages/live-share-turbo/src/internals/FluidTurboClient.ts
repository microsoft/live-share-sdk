import {
    IFluidContainer,
    IValueChanged,
    LoadableObjectClass,
    SharedMap,
} from "fluid-framework";
import { AzureContainerServices } from "@fluidframework/azure-client";
import { IFluidHandle, IFluidLoadable } from "@fluidframework/core-interfaces";
import { TurboDataObject } from "../dds-objects/TurboDataObject";
import { DataObject } from "@fluidframework/aqueduct";
import { ISharedObjectEvents } from "@fluidframework/shared-object-base";
import { IFluidTurboClient } from "../interfaces/IFluidTurboClient";
import { SharedDataObject } from "../interfaces";

export class FluidTurboClient implements IFluidTurboClient {
    protected _dynamicDDSMap = new Map<string, TurboDataObject<any, any>>();

    /**
     * Get the Fluid join container results
     */
    public get results():
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
          }
        | undefined {
        // Implemented by LiveShareTurboClient and AzureTurboClient
        throw new Error("Not implemented exception");
    }

    public get stateMap(): SharedMap | undefined {
        if (this.results) {
            return this.results.container.initialObjects.stateMap as SharedMap;
        }
        return undefined;
    }

    /**
     * @hidden
     */
    public get dynamicObjects(): SharedMap | undefined {
        if (this.results) {
            return this.results.container.initialObjects.dynamicObjects as SharedMap;
        }
        return undefined;
    }

    protected registerDynamicObjectListeners() {
        const valueChangedListener = async (changed: IValueChanged, local: boolean) => {
            if (local) return;
            
            const key = changed.key;
            const existingValue = this._dynamicDDSMap.get(key);
            try {
                const dds = await this.loadDDS(key);
                if (existingValue && dds) {
                    existingValue.dataObject = dds;
                }
            } catch (error: any) {
                console.error(error);
            }
        }
        this.dynamicObjects!.on("valueChanged", valueChangedListener);
    }

    /**
     * Callback to load a Fluid DDS for a given key. If the object does not already exist, a new one will be created.
     *
     * @param uniqueKey unique key for the Fluid DDS you'd like to load
     * @param objectClass Fluid LoadableObjectClass you'd like to load of type T
     * @param onDidFirstInitialize Optional. Callback that is used when the object was initially created.
     * @returns
     */
    public async getDDS<
        I extends ISharedObjectEvents = ISharedObjectEvents,
        T extends SharedDataObject = DataObject<any>
    >(
        uniqueKey: string,
        objectClass: LoadableObjectClass<T>,
        constructTurboDataObject: (dds: IFluidLoadable) => TurboDataObject<I, T>,
    ): Promise<{
        created: boolean,
        dds: TurboDataObject<I, T>,
    }> {
        const existingValue = this._dynamicDDSMap.get(uniqueKey);
        if (existingValue !== undefined) {
            return {
                created: false,
                dds: existingValue as TurboDataObject<I, T>,
            };
        }
        // Set initial values, if known
        let dds = await this.loadDDS<T>(uniqueKey);
        const needCreate = !dds;
        if (needCreate) {
            // Create a new DDS of type T
            dds = await this.createDDS<T>(uniqueKey, objectClass);
        }
        const turboObject = constructTurboDataObject(dds!);
        this._dynamicDDSMap.set(uniqueKey, turboObject);
        return {
            dds: turboObject,
            created: needCreate,
        };
    }

    // Get the DDS from dynamicObjects for a given key, if known
    protected async loadDDS<T extends IFluidLoadable>(
        key: string
    ): Promise<T | undefined> {
        const dynamicObjectMap = this.dynamicObjects;
        if (dynamicObjectMap) {
            const handleValue = dynamicObjectMap.get<
                IFluidHandle<T> & IFluidLoadable
            >(key);
            if (handleValue) {
                const dds = await handleValue.get();
                return dds;
            } else {
                return undefined;
            }
        } else {
            throw new Error(
                "getDDS should never be called if dynamicObjects is undefined"
            );
        }
    }

    // Create a new DDS of type T in dynamicObjects
    protected async createDDS<T extends IFluidLoadable>(
        key: string,
        objectClass: LoadableObjectClass<T>
    ): Promise<T> {
        const dynamicObjectMap = this.dynamicObjects;
        if (dynamicObjectMap) {
            // Create a new DDS and set the handle to the DDS
            const dds = await this.results!.container.create<T>(objectClass);
            dynamicObjectMap.set(key, dds.handle);
            return dds;
        } else {
            throw new Error(
                "createDDS: should never be called if dynamicObjectsMap is undefined"
            );
        }
    }
}

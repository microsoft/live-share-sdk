import { LoadableObjectClass, SharedMap } from "fluid-framework";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { TurboDataObject } from "../dds-objects/TurboDataObject";
import { DataObject } from "@fluidframework/aqueduct";
import { ISharedObjectEvents } from "@fluidframework/shared-object-base";
import { SharedDataObject } from "../internals/types";

export interface IFluidTurboClient {
    get stateMap(): SharedMap | undefined;
    get dynamicObjects(): SharedMap | undefined;
    getDDS<
        I extends ISharedObjectEvents = ISharedObjectEvents,
        T extends SharedDataObject = DataObject<any>
    >(
        uniqueKey: string,
        objectClass: LoadableObjectClass<T>,
        constructTurboDataObject: (dds: IFluidLoadable) => TurboDataObject<I, T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<{
        created: boolean,
        dds: TurboDataObject<I, T>,
    }>;
}
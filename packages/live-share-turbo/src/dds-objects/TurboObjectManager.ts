import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { TaskManager } from "@fluid-experimental/task-manager";
import {
    SharedMap,
    LoadableObjectClass,
    IFluidContainer,
} from "fluid-framework";
import {
    IFluidHandle,
    FluidObject,
    IFluidLoadable,
} from "@fluidframework/core-interfaces";
import { Deferred, assert } from "@fluidframework/common-utils";

const dynamicObjectsKey = "<<dynamicObjectsKey>>";
const taskManagerKey = "<<taskManagerKey>>";

/**
 * Fluid DataObject used in `FluidTurboClient` for the purposes of dynamically loading DDSes.
 * @remarks
 * If a DDS does not yet exist for a given key, a new one is created. Fluid `TaskManager` is used to ensure that only one person is responsible for
 * creating the DDS to prevent data loss. Note that a user must have an active websocket connection to create data objects under this method.
 */
export class TurboObjectManager extends DataObject {
    private _dynamicObjectsMap: SharedMap | undefined;
    private _taskManager: TaskManager | undefined;
    private _container: IFluidContainer | undefined;
    private _pendingGetDDSMap = new Map<
        string,
        {
            deferred: Deferred<{
                dds: FluidObject<any> & IFluidLoadable;
                created: boolean;
            }>;
            loadableClass: LoadableObjectClass<any>;
        }
    >();

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share-turbo:TurboObjectManager`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        TurboObjectManager.TypeName,
        TurboObjectManager,
        [TaskManager.getFactory()],
        {}
    );

    /**
     * initializingFirstTime is run only once by the first client to create the DataObject.  Here we use it to
     * initialize the state of the DataObject.
     */
    protected async initializingFirstTime() {
        // Create a SharedMap for dynamic objects
        const dynamicObjectsMap = SharedMap.create(
            this.runtime,
            dynamicObjectsKey
        );
        // We create a TaskManager just like any other DDS.
        const taskManager = TaskManager.create(this.runtime, taskManagerKey);
        this.root.set(taskManagerKey, taskManager.handle);
        this.root.set(dynamicObjectsKey, dynamicObjectsMap.handle);
    }

    /**
     * hasInitialized is run by each client as they load the DataObject.  Here we use it to set up usage of the
     * DataObject, by registering an event listener for dice rolls.
     */
    protected async hasInitialized() {
        const dynamicObjectsHandle =
            this.root.get<IFluidHandle<SharedMap>>(dynamicObjectsKey);
        this._dynamicObjectsMap = await dynamicObjectsHandle?.get();
        const taskManagerHandle =
            this.root.get<IFluidHandle<TaskManager>>(taskManagerKey);
        this._taskManager = await taskManagerHandle?.get();
        // Listen for changes to the dynamic objects map
        this._dynamicObjectsMap?.on("valueChanged", async (changed, local) => {
            const pending = this._pendingGetDDSMap.get(changed.key);
            if (pending) {
				// The user is waiting for a DDS value for this key, so we attempt to resolve their request
                try {
                    const dds = await this.internalGetDDS(changed.key);
                    if (dds) {
                        pending.deferred.resolve({
                            dds,
                            created: local === true,
                        });
                    } else {
                        pending.deferred.reject(
                            new Error(
                                `TurboObjectManager: DDS undefined for key ${changed.key}`
                            )
                        );
                    }
                } catch (error) {
                    pending.deferred.reject(error);
                } finally {
					// Stop tracking the pending request
                    this._pendingGetDDSMap.delete(changed.key);
                }
            }
        });
		// Listen for task assignments
        this.listenForTaskAssignments();
    }

    private get taskManager() {
        assert(this._taskManager !== undefined, "TaskManager not initialized");
        return this._taskManager;
    }
    private get dynamicObjectsMap() {
        assert(
            this._dynamicObjectsMap !== undefined,
            "dynamicsObjectMap not initialized"
        );
        return this._dynamicObjectsMap;
    }
    private get container(): IFluidContainer | undefined {
        return this._container;
    }
    private set container(value: IFluidContainer | undefined) {
        this._container = value;
    }

	/**
	 * Dynamically loads a Fluid object. If one does not exist, a new one will be created.
	 * 
	 * @template T Type of Fluid object to load.
	 * @param key unique key for the dynamic object
	 * @param loadableClass the Fluid LoadableObjectClass
	 * @param container Fluid container to load the DDS into
	 * @returns the DDS and whether or not it was created locally
	 */
    public async getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        key: string,
        loadableClass: LoadableObjectClass<T>,
        container: IFluidContainer
    ): Promise<{
        dds: T;
        created: boolean;
    }> {
        if (!this.container) {
            this.container = container;
        }
		// Check if the DDS already exists. If it does, return that.
        const dds = await this.internalGetDDS<T>(key);
        if (dds) {
            return {
                dds,
                created: false,
            };
        } else {
			// Track a deferred promise for getting the DDS
            const deferred = new Deferred<{
                dds: T;
                created: boolean;
            }>();
            this._pendingGetDDSMap.set(key, {
                deferred,
                loadableClass,
            });
            try {
				// Join the TaskManager queue to create the DDS
                // TODO: In @fluidframework/task-manager v2, there is a taskManager.subscribeToTask() function so that this doesn't fail on disconnects
                this.taskManager.lockTask(key);
            } catch (error) {
                console.error(error);
            }
            return deferred.promise;
        }
    }

	/**
	 * Get the DDS for a given unique identifier if it exists.
	 * 
	 * @param key unique identifier
	 * @returns existing DDS in the _dynamicObjectsMap or undefined if it does not exist
	 */
    private async internalGetDDS<
        T extends FluidObject<any> = FluidObject<any> & IFluidLoadable
    >(key: string): Promise<T | undefined> {
        const ddsHandle = this._dynamicObjectsMap?.get<IFluidHandle<T>>(key);
        if (ddsHandle) {
            const dds = await ddsHandle.get();
            return dds;
        } else {
            return undefined;
        }
    }

	/**
	 * Listen for assignments to tasks.
	 * @remarks
	 * `taskId` should correspond with the unique key of a dynamic object so that users will not receive task assignments for objects they are not attempting to
	 *  access.
	 */
    private async listenForTaskAssignments() {
        this.taskManager.on("assigned", async (taskId: string) => {
            const pending = this._pendingGetDDSMap.get(taskId);
            if (pending) {
				// The local user is waiting for a DDS response. Normally we would create a new one here, but as an extra layer of safety we double check
				// to see if there is already one set for the given key.
                try {
                    const checkForInternalDDS = await this.internalGetDDS(
                        taskId
                    );
                    if (checkForInternalDDS) {
                        pending.deferred.resolve({
                            dds: checkForInternalDDS,
                            created: false,
                        });
                        this._pendingGetDDSMap.delete(taskId);
                        return;
                    }
                } catch {}
				// Create a new DDS and store a reference to the handle in dynamicObjectsMap
                try {
                    const newDDS = await this.container!.create(
                        pending.loadableClass
                    );
                    this.dynamicObjectsMap.set(taskId, newDDS.handle);
                } catch (error) {
					// Reject the pending promise
                    pending.deferred.reject(error);
                    this._pendingGetDDSMap.delete(taskId);
					// TODO: if this user is the last user in the queue and it still failed, perhaps we need to add some additional safety
                }
            }
            // TODO: In @fluidframework/task-manager v2, there is a taskManager.complete() function that ejects everyone from queue. Once available, we should
            // use that to further minimize risk. Perhaps we can request a feature to fully prevent that key from ever being queued again.
            // Delay abandon to minimize risk...is this even necessary though?
            setTimeout(() => {
                this.taskManager.abandon(taskId);
            }, 1000);
        });
    }
}

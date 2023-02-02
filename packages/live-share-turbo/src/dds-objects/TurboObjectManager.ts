import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { TaskManager } from "@fluid-experimental/task-manager";
import { SharedMap, LoadableObjectClass, IFluidContainer } from "fluid-framework";
import { IFluidHandle, FluidObject, IFluidLoadable } from "@fluidframework/core-interfaces";
import { Deferred, assert } from "@fluidframework/common-utils";

// export interface ILivePresenceEvents<TData extends object = object> {
//     /**
//      * The presence information for the local or a remote user has changed.
//      * @param event Name of event.
//      * @param listener Function called when event is triggered.
//      * @param listener.user Presence information that changed.
//      * @param listener.local If true the local users presence changed.
//      */
//     (
//         event: "objectCreated",
//         listener: (user: LivePresenceUser<TData>, local: boolean) => void
//     ): any;
// }
const dynamicObjectsKey = "<<dynamicObjectsKey>>";
const taskManagerKey = "<<taskManagerKey>>";

export class TurboObjectManager extends DataObject {
	private _dynamicObjectsMap: SharedMap | undefined;
    private _taskManager: TaskManager | undefined;
	private _container: IFluidContainer | undefined;
	private _pendingGetDDSMap = new Map<string, {
		deferred: Deferred<{
			dds: FluidObject<any> & IFluidLoadable,
			created: boolean,
		}>,
		loadableClass: LoadableObjectClass<any>,
	}>();

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
		const dynamicObjectsMap = SharedMap.create(this.runtime, dynamicObjectsKey);
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
		const dynamicObjectsHandle = this.root.get<IFluidHandle<SharedMap>>(dynamicObjectsKey);
		this._dynamicObjectsMap = await dynamicObjectsHandle?.get();
		const taskManagerHandle = this.root.get<IFluidHandle<TaskManager>>(taskManagerKey);
		this._taskManager = await taskManagerHandle?.get();
		// Listen for changes to the dynamic objects map
		this._dynamicObjectsMap?.on("valueChanged", async (changed, local) => {
			const pending = this._pendingGetDDSMap.get(changed.key);
			if (pending) {
				try {
					const dds = await this.internalGetDDS(changed.key);
					if (dds) {
						pending.deferred.resolve({
							dds,
							created: local === true,
						});
					} else {
						pending.deferred.reject(new Error(`TurboObjectManager: DDS undefined for key ${changed.key}`));
					}
				} catch (error) {
					pending.deferred.reject(error);
				} finally {
					this._pendingGetDDSMap.delete(changed.key);
				}
			}
		});
		this.listenForTaskChanges();
	}

	private get taskManager() {
		assert(this._taskManager !== undefined, "TaskManager not initialized");
		return this._taskManager;
	}
	private get dynamicObjectsMap() {
		assert(this._dynamicObjectsMap !== undefined, "dynamicsObjectMap not initialized");
		return this._dynamicObjectsMap;
	}
	private get container(): IFluidContainer | undefined {
		return this._container;
	}
	private set container(value: IFluidContainer | undefined) {
		this._container = value;
	}

	public async getDDS<T extends IFluidLoadable = FluidObject<any> & IFluidLoadable>(key: string, loadableClass: LoadableObjectClass<T>, container: IFluidContainer): Promise<{
		dds: T,
		created: boolean,
	}> {
		if (!this.container) {
			this.container = container;
		}
		const dds = await this.internalGetDDS<T>(key);
		if (dds) {
			return {
				dds,
				created: false,
			};
		} else {
			const deferred = new Deferred<{
				dds: T,
				created: boolean,
			}>();
			this._pendingGetDDSMap.set(key, {
				deferred,
				loadableClass,
			});
			try {
				// TODO: In @fluidframework/task-manager v2, there is a taskManager.subscribeToTask() function so that this doesn't fail on disconnects
				this.taskManager.lockTask(key);
			} catch (error) {
				console.error(error);
			}
			return deferred.promise;
		}
	}

	private async internalGetDDS<T extends FluidObject<any> = FluidObject<any> & IFluidLoadable>(key: string): Promise<T | undefined> {
		const ddsHandle = this._dynamicObjectsMap?.get<IFluidHandle<T>>(key);
		if (ddsHandle) {
			const dds = await ddsHandle.get();
			return dds;
		} else {
			return undefined;
		}
	}

	private async listenForTaskChanges() {
		this.taskManager.on("assigned", async (taskId: string) => {
			const pending = this._pendingGetDDSMap.get(taskId);
			if (pending) {
				try {
					const checkForInternalDDS = await this.internalGetDDS(taskId);
					if (checkForInternalDDS) {
						pending.deferred.resolve({
							dds: checkForInternalDDS,
							created: false,
						});
						this._pendingGetDDSMap.delete(taskId);
						return;
					}
				} catch {}
				// TODO: .create isn't available for DataObject classes...what is the equivalent?
				try {
					const newDDS = await this.container!.create(pending.loadableClass)
					this.dynamicObjectsMap.set(taskId, newDDS.handle);
				} catch (error) {
					pending.deferred.reject(error);
					this._pendingGetDDSMap.delete(taskId);
				}
			}
			// TODO: In @fluidframework/task-manager v2, there is a taskManager.complete() function that ejects everyone from queue. Once available, we should
			// use that to further minimize risk. Perhaps we can request a feature to fully prevent that key from ever being queued again.
			// Delay abandon to minimize risk...is this even necessary though?
			setTimeout(() => {
				this.taskManager.abandon(taskId);
			}, 1000)
		});
	}
}
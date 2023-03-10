import React from "react";
import { useDynamicDDS } from "./useDynamicDDS";
import { TaskManager  } from "@fluid-experimental/task-manager";
import { DynamicObjectRegistry } from "@microsoft/live-share";

// Register TaskManager as dynamic object
DynamicObjectRegistry.registerObjectClass(TaskManager, TaskManager.getFactory().type);

/**
 * A hook for joining a queue to lock tasks for a given id. Guaranteed to have only one user assigned to a task at a time.
 * 
 * @param uniqueKey the unique key for the TaskManager DDS
 * @param taskId the task id to lock
 * @returns stateful data about the status of the task lock
 */
export const useTaskManager = (uniqueKey: string, taskId?: string): {
    lockedTask: boolean;
    taskManager: TaskManager | undefined;
} => {
    /**
     * TaskId currently in queue for
     */
    const currentTaskIdRef = React.useRef<string | undefined>(undefined);
    /**
     * Stateful boolean that is true when the user is currently assigned the task
     */
    const [lockedTask, setLockedTask] = React.useState<boolean>(false);

    /**
     * User facing: dynamically load the TaskManager DDS for the given unique key.
     */
    const { dds: taskManager } = useDynamicDDS<TaskManager>(uniqueKey, TaskManager);

    /**
     * When the task id changes, lock the task. When the task id is undefined, abandon the task.
     */
    React.useEffect(() => {
        let mounted = true;
        if (taskManager) {
            if (taskId && currentTaskIdRef.current !== taskId) {
                if (currentTaskIdRef.current) {
                    taskManager.abandon(currentTaskIdRef.current);
                    setLockedTask(false);
                }
                currentTaskIdRef.current = taskId;
                const onLockTask = async () => {
                    try {
                        await taskManager.lockTask(taskId);
                        if (mounted) {
                            setLockedTask(true);
                        }
                    } catch {
                        if (mounted) {
                            setLockedTask(false);
                            currentTaskIdRef.current = undefined;
                        }
                    }
                }
                onLockTask();
            } else if (!taskId && currentTaskIdRef.current) {
                taskManager.abandon(currentTaskIdRef.current);
                setLockedTask(false);
                currentTaskIdRef.current = undefined;
            }
        }
        /**
         * When the component unmounts, abandon the task if it is still locked
         */
        return () => {
            mounted = false;
            if (currentTaskIdRef.current) {
                taskManager?.abandon(currentTaskIdRef.current);
            }
            currentTaskIdRef.current = undefined;
        }
    }, [taskManager, taskId]);

    return {
        lockedTask,
        taskManager,
    };
};
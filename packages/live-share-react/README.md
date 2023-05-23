# Live Share React

**DISCLAIMER:** This package is in preview and experimental. We are not yet committed to maintaining this package and may make breaking changes at any time. Read this package's [license](./LICENSE) for more information.

Live Share React is designed to make building collaborative apps in React simple and intuitive, all using familiar patterns from functional React.

Here is a simple example of how to get started:

```javascript
// LiveShareApp.jsx
import { LiveShareProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";

const host = LiveShareHost.create();

export function LiveShareApp() {
  // Call app.initialize() from teams-js before rendering LiveShareProvider

  return (
    <LiveShareProvider
      joinOnLoad={true}
      host={host}
    >
      <SharedCheckbox />
    </LiveShareProvider>
  );
}

// SharedCheckbox.jsx
import { useSharedState } from "@microsoft/live-share-react";

export function SharedCheckbox() {
  const [checked, setChecked] = useSharedState("MY-UNIQUE-ID", false);
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => {
        setChecked(!checked);
      }}
    />
  );
}
```

## Getting started

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-media @microsoft/live-share-canvas @microsoft/live-share-react --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-media @microsoft/live-share-canvas @microsoft/live-share-react
```

### Building package

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install
npm run build
```

This will use npm workspaces to hoist and build all dependencies.

### Sample app

After installing/building the packages, you can also try out a [working sample here](../../samples/04.live-share-react/).

## Live Share React vs. Vanilla Fluid

Fluid Framework and Live Share are powerful frameworks that can greatly simplify the effort of building collaborative applications, but for many React applications, it can take time to get used to. This experimental package aims to strip away as much of that learning curve as possible.

Where traditional Fluid utilizes a developer-defined object schema with a hierarchal structure, this package abstracts that out on your behalf. While you can still tap into more complicated hierarchies with this library, it is designed to behave more like blob storage / NoSQL.

To use Fluid's distributed-data structures (DDS) or Live Share's live objects, you can simply use the corresponding React hook, providing a unique identifier for that DDS. If no DDS exists when the component is first mounted, we automatically create one for you. Otherwise, we will connect to the existing one.

Much like React itself, this package is opinionated, and it may not be for everyone. To learn more about using Live Share the traditional way, see our [Live Share README](../live-share/README.md).

## Types of hooks

Live Share supports all of the live data structures provided through Live Share, and most of the officially supported DDS's available through Fluid Framework. If you have custom data objects, this package also exposes some underlying APIs for building your own custom React hooks.

Here are the hooks provided by this library:

### useSharedState

Inspired by React's own `useState` hook, `useSharedState` should feel familiar to React developers. Under the hood, this hook uses a Fluid `SharedMap` dedicated for `useSharedState`, listening for changes to the key provided and automatically updating the shared state with any changes. And yes, if two components in the same application use the same key, those components will be in sync with each other!

Since these keys are a `string` you provide while calling `useSharedState`, you can dynamically load these into your app as needed. With this in mind, we've also provided an optional `disposeState` action if the state is no longer relevant to your app. If you don't dispose it, then the data will persist in the container should you access it later (up to the lifetime of the Fluid container).

The following example shows how `useSharedState` can be used to dynamically create collaborative features in your app on the fly:

```javascript
import { useSharedState } from "@microsoft/live-share-react";

export function CounterCard({ card, onDelete }) {
  const [count, setCount, disposeCount] = useSharedState(
    `card-count:${card.id}`,
    0
  );
  return (
    <div className="card">
      <h3>{card.title}</h3>
      <button
        onClick={() => {
          setCount(count + 1);
        }}
      >
        {"+1"}
      </button>
      <span>{`${count} `}</span>
      <button
        onClick={() => {
          onDelete(card.id);
          disposeCount();
        }}
      >
        {"Delete"}
      </button>
    </div>
  );
}
```

_NOTE:_ While this hook will get you pretty far on its own, carefully consider which of our React hook is best for your scenario.

### useSharedMap

This hook loads a Fluid `SharedMap` corresponding with the key you provide. Compared to `useSharedState`, this hook allows you to render a collection of items with less risk of conflict when multiple users may be writing to the same object simultaneously. For example, rather than storing an entire list of objects in a single key of `useSharedState`, the map allows each item in the list to have its own unique key.

While you write to keys individually, the `map` object exposed through the hook uses React state itself. Lets see an example in action:

```javascript
import { useSharedMap } from "@microsoft/live-share-react";
import { v4 as uuid } from "uuid";

export function CardList() {
  const { map, setEntry, deleteEntry } = useSharedMap("CUSTOM-MAP-ID");
  return (
    <div>
      <h2>{"Cards"}</h2>
      <button
        onClick={() => {
          const id = uuid();
          setEntry(id, {
            id,
            title: "Custom Card",
          });
        }}
      >
        {"+ Add card"}
      </button>
      <div className="flex wrap row hAlign">
        {[...map.values()].map((cardValue) => (
          <CounterCard
            key={cardValue.id}
            card={cardValue}
            onDelete={deleteEntry}
          />
        ))}
      </div>
    </div>
  );
}
```

### useLivePresence

Presence makes it easy to track which users are currently in the session and assign custom data to them.

```javascript
import { useLivePresence } from "@microsoft/live-share-react";
import { PresenceState } from "@microsoft/live-share";

export function OnlineUsers() {
  const { localUser, allUsers, updatePresence } = useLivePresence(
    "UNIQUE-PRESENCE-KEY", // required unique key for presence
    { favoriteColor: "red" } // optional custom data object
  );
  return (
    <div>
      <h1>{"Online Users:"}</h1>
      <div>
        {allUsers
          .filter((user) => user.state === PresenceState.online)
          .map((user) => (
            <div key={user.userId}>
                {user.displayName + " " + user.data!.favoriteColor}
            </div>
          ))}
      </div>
      <button
        onClick={() => {
          updatePresence(
            localUser.data,
            localUser?.state === PresenceState.offline
              ? PresenceState.online
              : PresenceState.offline,
          );
        }}
      >
        {`Toggle status`}
      </button>
    </div>
  );
}
```

### useLiveState

Unlike `useSharedState`, `useLiveState` is only stateful while one or more users are connected to it. This can make it easy to have state that behaves more closely to a regular React `useState`, when desireable.

This component also features role verification, which allows you to choose the Teams meeting roles which are eligible to edit the state, if needed.

```javascript
import { useLiveState } from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter ];

export function AppState() {
  const [state, setState] = useLiveState("CUSTOM-STATE-ID", ExampleAppState.WAITING, ALLOWED_ROLES);

  if (state === ExampleAppState.WAITING) {
    return (
      <div>
        <h2>{"Waiting"}</h2>
        <button
          onClick={() => {
            setState(ExampleAppState.START, {
              startedBy: "First Last",
            });
          }}
        >
          {"Start"}
        </button>
      </div>
    );
  }
  return (
    <div>
      <h2>{`Started by: ${data!.startedBy}`}</h2>
      <button
        onClick={() => {
          setState(ExampleAppState.WAITING, undefined);
        }}
      >
        {"End"}
      </button>
    </div>
  );
};
```

### useLiveEvent

If you want to generic JSON between clients that is completely transient, then `useLiveEvent` is a great choice. A good example of that is a reactions feature similar to that in Microsoft Teams meetings, since people joining a meeting late don't need to see reactions from earlier in the meeting.

Here is a simple example:

```javascript
import { useLiveEvent } from "@microsoft/live-share-react";

export function Reactions() {
  const { latestEvent, sendEvent } = useLiveEvent("EVENT-ID");

  return (
    <div>
      {/* Buttons for sending reactions */}
      <button
        onClick={() => {
          sendEvent({ emoji: "❤️" });
        }}
      >
        {"❤️"}
      </button>
      <button
        onClick={() => {
          sendEvent({ emoji: "😂" });
        }}
      >
        {"😂"}
      </button>
      {/* Show latest reaction */}
      {latestEvent?.local === false && (
        <div>{`Received: ${latestEvent?.value.emoji}`}</div>
      )}
      {latestEvent?.local === true && (
        <div>{`Sent: ${latestEvent?.value.emoji}`}</div>
      )}
    </div>
  );
}
```

### useLiveTimer

You can use the `useLiveTimer` hook to build a synchronized countdown timer. A good example of that might be a meditation timer or a countdown for a round in a group activity.

Here is a simple example:

```javascript
import { useLiveTimer } from "@microsoft/live-share-react";

export function CountdownTimer() {
  const { milliRemaining, timerConfig, start, pause, play } = useLiveTimer("TIMER-ID");

  return (
    <div>
      <button
        onClick={() => {
          start(60 * 1000);
        }}
      >
        { timerConfig === undefined ? "Start" : "Reset" }
      </button>
      { timerConfig !== undefined && (
        <button
          onClick={() => {
            if (timerConfig.running) {
              pause();
            } else {
              play();
            }
          }}
        >
          {timerConfig.running ? "Pause" : "Play" }
        </button>
      )}
      { milliRemaining !== undefined && (
        <p>
          { `${Math.round(milliRemaining / 1000)} / ${Math.round(timerConfig.duration) / 1000}` }
        </p>
      )}
    </div>
  );
}
```

### useMediaSynchronizer

If you want to synchronize video content, `@microsoft/live-share-media` is also supported by this package through the `useMediaSynchronizer` hook. Using any `HTMLMediaPlayer` element, or a delegate object matching our `IMediaPlayer` interface, you can easily build watch together capabilities into your app.

Let's see this in action:

```javascript
import { useMediaSynchronizer } from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";
import { useRef } from "react";

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];

const INITIAL_TRACK =
  "https://storage.googleapis.com/media-session/big-buck-bunny/trailer.mov";

export function VideoPlayer() {
  const videoRef = useRef(null);
  const { play, pause } = useMediaSynchronizer(
    "MEDIA-SESSION-ID",
    videoRef,
    INITIAL_TRACK,
    ALLOWED_ROLES
  );

  return (
    <div>
      <video ref={videoRef} />
      <button onClick={play}>{"Play"}</button>
      <button onClick={pause}>{"Pause"}</button>
    </div>
  );
}
```

### useLiveCanvas

If you want to add turn-key inking & cursors, use the `useLiveCanvas` hook, powered by `@microsoft/live-share-canvas`.

Let's see this in action:

```javascript
import { useLiveCanvas } from "@microsoft/live-share-react";
import { InkingTool } from "@microsoft/live-share-canvas";
import { useRef } from "react";

export const ExampleLiveCanvas = () => {
    const liveCanvasRef = useRef(null);
    const { liveCanvas, inkingManager } = useLiveCanvas(
        "CUSTOM-LIVE-CANVAS",
        liveCanvasRef,
    );

    return (
        {/** Canvas currently needs to be a child of a parent with absolute styling */}
        <div style={{ position: "absolute"}}>
            <div
                ref={liveCanvasRef}
                // Best practice is to not define inline styles
                style={{ width: "556px", height: "224px" }}
            />
            {!!liveCanvas && (
                <div>
                    <button
                        onClick={() => {
                            inkingManager.tool = InkingTool.pen;
                        }}
                    >
                        {"Pen"}
                    </button>
                    <button
                        onClick={() => {
                            inkingManager.tool = InkingTool.laserPointer;
                        }}
                    >
                        {"Laser pointer"}
                    </button>
                </div>
            )}
        </div>
    );
};
```

### useTaskManager

If you want to ensure that only one user is responsible for a given task, you can use `useTaskManager`, which uses Fluid's `TaskManager` DDS.

Let's see this in action:

```javascript
import { useTaskManager } from "@microsoft/live-share-react";

export const ExampleTaskManager = () => {
    const [taskId, setTaskId] = useState(undefined);
    const { lockedTask } = useTaskManager(
        "CUSTOM-TASK-MANAGER",
        taskId,
    );

    const displayText = lockedTask
        ? "You are assigned the task"
        : "Waiting for task assignment";

    return (
        <div>
            {!taskId && (
                <button
                    onClick={() => {
                        setTaskId("task-id")
                    }}
                >
                    {'Join task queue'}
                </button>
            )}
            {taskId && (
                <button
                    onClick={() => {
                        setTaskId(undefined)
                    }}
                >
                    {'Leave task queue'}
                </button>
            )}
            <p>{displayText}</p>
        </div>
    );
};
```

### Custom Fluid object hooks

If you want to dynamically load a custom Fluid object in your app, use the `useDynamicDDS` to create a custom hook. This is the same hook that Live Share React uses internally within our custom hooks, such as `useLiveEvent`. If you made a custom data object or are using one of Fluid's experimental data structures, you also must register your Fluid `LoadableObjectClass` with `DynamicObjectRegistry.registerObjectClass` to `@microsoft/live-share`, if it is not already.

Implementations may vary for each dynamic object & hook. We will try and update this package periodically with new packages released by Fluid Framework and Live Share, as they are published.

Example:

```typescript
import React from "react";
import { useDynamicDDS } from "@microsoft/live-share-react";
import { DynamicObjectRegistry } from "@microsoft/live-share";
import { TaskManager  } from "@fluid-experimental/task-manager";

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
```

## Code samples

| Sample name       | Description                                                             | Javascript                                            |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Live Share React  | Simple example with each of our custom Live Share React hooks.          | [View](../../samples/javascript/04.live-share-react)  |

## React version compatibility

This package is compatible with React versions `^16.8.0` and greater, including React v18. In order to ensure compatibility with different versions React, this project does not currently use React Suspense for data fetching on load. We are closely monitoring React guidelines and may post updates as this evolves further. If you have feedback or thoughts on this topic, join the [discussion](https://github.com/microsoft/live-share-sdk/discussions/442).

## Package Compatibility

The Live Share SDK contains dependencies for [@microsoft/teams-js](https://www.npmjs.com/package/@microsoft/teams-js) and [fluid-framework](https://www.npmjs.com/package/fluid-framework) packages among others. Both of these packages are sensitive to the package version your app any libraries use. You will likely run into issues if the package version your app uses doesn't match the version other libraries you depend on use.

**It is critical that your app use the package dependencies listed in the table below.** Lookup the version of the `@microsoft/live-share` you're using and set any other dependencies in your package.json file to match:

| @microsoft/live-share | @microsoft/teams-js  | fluid-framework | @microsoft/live-share-\*   | @fluidframework/azure-client | @microsoft/TeamsFx              | @microsoft/TeamsFx-react        |
| --------------------- | -------------------- | --------------- | -------------------------- | ---------------------------- | ------------------------------- | ------------------------------- |
| ^1.0.0                  | ^2.11.0             | ^1.2.3          | ^1.0.0                      | ^1.0.0                       | ^2.5.0                        | ^2.5.0                          |

## Contributing

There are several ways you can [contribute](../../CONTRIBUTING.md) to this project:

- [Submit bugs](https://github.com/microsoft/live-share-sdk/issues) and help us verify fixes as they are checked in.
- Review the source code changes.
- Engage with other Live Share developers on [StackOverflow](https://stackoverflow.com/questions/tagged/live-share).
- [Contribute bug fixes](../../CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact <opencode@microsoft.com> with any additional questions or comments.

## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) at <secure@microsoft.com>. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the [MSRC PGP](https://technet.microsoft.com/security/dn606155) key, can be found in the [Security TechCenter](https://technet.microsoft.com/security/default).

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under a special [Microsoft](./LICENSE) License.

# Live Share React

Live Share React is designed to make building collaborative apps in React simple and intuitive, all using familiar patterns from functional React.

Here is a simple example of how to get started:

```javascript
// LiveShareApp.jsx
import { LiveShareContextProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";

const host = LiveShareHost.create();

export function LiveShareApp() {
  // Call app.initialize() from teams-js before rendering LiveShareContextProvider

  return (
    <LiveShareContextProvider
      joinOnLoad={true}
      host={host}
    >
      <SharedCheckbox />
    </LiveShareContextProvider>
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

### Building package

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install --legacy-peer-dep
npm run build
```

This will use lerna to hoist and build all dependencies.

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

Presence makes it easy to track which users are currently in the session and assign custom data to them. Unlike other hooks, `useLivePresence` has a default ID set for you, but you can override it with your own if you'd like.

```javascript
import { useLivePresence } from "@microsoft/live-share-react";
import { PresenceState } from "@microsoft/live-share";

export function OnlineUsers() {
  const { localUser, allUsers, updatePresence } = useLivePresence(
    "CUSTOM-USER-ID", // optional user id
    { name: "First Last" } // optional custom data object
  );
  return (
    <div>
      <h1>{"Online Users:"}</h1>
      <div>
        {allUsers
          .filter((user) => user.state === PresenceState.online)
          .map((user) => (
            <div key={user.userId}>{user.name}</div>
          ))}
      </div>
      <button
        onClick={() => {
          updatePresence(
            localUser?.state === PresenceState.offline
              ? PresenceState.online
              : PresenceState.offline,
            localUser.data
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
  const [state, data, setState] = useLiveState("CUSTOM-STATE-ID", ALLOWED_ROLES, ExampleAppState.WAITING);

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
        <div>{`Received: ${latestEvent?.event.emoji}`}</div>
      )}
      {latestEvent?.local === true && (
        <div>{`Sent: ${latestEvent?.event.emoji}`}</div>
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

### useDynamicDDS

If you want to dynamically load a custom Fluid object in your app, you can easily do that using `useDynamicDDS`. Each of the hooks mentioned above (with the exception of `useSharedState`) use this under the hood.

Here is an example of how to use it in your app:

```javascript
// LiveShareApp.jsx
import { LiveShareContextProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { SharedTree } from "@fluid-experimental/tree";

export function LiveShareApp() {
  // Pass in custom `additionalDynamicObjectTypes` prop using custom `IFluidLoadable`
  return (
    <LiveShareContextProvider
      joinOnLoad={true}
      additionalDynamicObjectTypes={[SharedTree]}
    >
      <ExampleSharedTree uniqueId="MY-TREE-ID" />
    </LiveShareContextProvider>
  );
}

// ExampleSharedTree.jsx
import { useDynamicDDS } from "@microsoft/live-share-react";
import { SharedTree } from "@fluid-experimental/tree";

export function ExampleSharedTree({ uniqueId }) {
  const onFirstInitialize () => {
    // Set initial values for SharedTree, if needed
  }
  const { dds: sharedTree } = useDynamicDDS(
    `<SharedTree>:${uniqueId}`,
    SharedTree,
    onFirstInitialize, // optional
  );

  if (sharedTree === undefined) {
    return <div>{"Loading..."}</div>;
  }

  return {
    /* Your UI here */
  };
}
```

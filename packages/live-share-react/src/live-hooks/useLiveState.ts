import { LiveState, UserMeetingRole } from "@microsoft/live-share";
import { useCallback, useEffect, useRef, useState } from "react";
import { SetLiveStateAction } from "../types";
import { useDynamicDDS } from "../shared-hooks";

interface ILiveStateStatus<
  TState extends string = string,
  TData extends object = object
> {
  state?: TState;
  data?: TData;
}

export function useLiveState<
  TState extends string = string,
  TData extends object = object
>(
  uniqueKey: string,
  allowedRoles?: UserMeetingRole[],
  initialState?: TState,
  initialData?: TData
): [
  TState | undefined,
  TData | undefined,
  SetLiveStateAction<TState, TData>
] {
  const listeningRef = useRef(false);
  const [current, setCurrent] = useState<ILiveStateStatus<TState, TData>>({
    state: initialState,
    data: initialData,
  });

  const { dds: liveState } = useDynamicDDS<LiveState<TData>>(
    `<LiveState>:${uniqueKey}`,
    LiveState<TData>
  );

  const changeState = useCallback(
    (state: TState, value?: TData | undefined) => {
      if (!liveState) {
        console.error(
          new Error("Cannot call changeState when liveState is undefined")
        );
        return;
      }
      if (!liveState.isInitialized) {
        console.error(
          new Error(
            "Cannot call changeState while liveState is not started"
          )
        );
        return;
      }
      console.log("changeState");
      liveState?.changeState(state, value);
    },
    [liveState]
  );

  useEffect(() => {
    if (listeningRef.current || !liveState) return;
    listeningRef.current = true;

    const onStateChanged = (state: TState, data: TData | undefined) => {
      console.log("onStateChanged");
      setCurrent({
        state,
        data,
      });
    };
    console.log("stateChanged on");
    liveState.on("stateChanged", onStateChanged);
    if (!liveState.isInitialized) {
      console.log("starting LiveState");
      liveState.initialize(allowedRoles, initialState, initialData);
      if (liveState.state) {
        onStateChanged(liveState.state as TState, liveState.data);
      }
    } else if (liveState.state) {
      console.log("liveState already started, refreshing tracked state");
      onStateChanged(liveState.state as TState, liveState.data);
    }

    return () => {
      listeningRef.current = false;
      console.log("stateChanged off");
      liveState?.off("stateChanged", onStateChanged);
    };
  }, [liveState]);

  return [current?.state, current?.data, changeState];
}

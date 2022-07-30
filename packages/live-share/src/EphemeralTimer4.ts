import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { EphemeralEventScope } from "./EphemeralEventScope";
import { EphemeralEventTarget } from "./EphemeralEventTarget";
import { EphemeralObjectSynchronizer } from "./EphemeralObjectSynchronizer";
import { IEphemeralEvent, UserMeetingRole } from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { cloneValue } from "./internals/utils";
import { EphemeralEvent } from "./EphemeralEvent";
import { TimeInterval } from "./TimeInterval";

/** for all time values millis from epoch is used */
export interface ITimerState4 {
  timestamp: number;
  clientId: string;
  duration: number;
}

export interface ITimerStateRunning extends ITimerState4 {
  timeStarted: number;
}

export interface ITimerStateStopped extends ITimerState4 {
  position: number;
}

export interface IEphemeralTimerEvents extends IEvent {
  (
    event: "onTimerChanged",
    listener: (state: ITimerState4, local: boolean) => void
  ): any;

  (
    event: "onTick",
    listener: (state: ITimerStateRunning, local: boolean) => void
  ): any;
}

export interface IPlayEvent extends IEphemeralEvent {
  duration: number;
  position: number;
}

export interface IPauseEvent extends IEphemeralEvent {
  duration: number;
  position: number;
}

export class EphemeralTimer4 extends DataObject<{
  Events: IEphemeralTimerEvents;
}> {
  // private _logger = new EphemeralTelemetryLogger(this.runtime);
  // private _allowedRoles: UserMeetingRole[] = [];
  private _currentState: ITimerState4 = {
    timestamp: 0,
    clientId: "",
    duration: 0,
    position: 0,
  } as ITimerStateStopped;

  private _scope?: EphemeralEventScope;
  private _playEvent?: EphemeralEventTarget<IPlayEvent>;
  private _pauseEvent?: EphemeralEventTarget<IPauseEvent>;
  private _synchronizer?: EphemeralObjectSynchronizer<ITimerState4>;
  private _timerInterval = new TimeInterval(100);
  private _intervalId: any;

  /**
   * The objects fluid type/name.
   */
  public static readonly TypeName = `@microsoft/live-share:EphemeralTimer4`;

  /**
   * The objects fluid type factory.
   */
  public static readonly factory = new DataObjectFactory(
    EphemeralTimer4.TypeName,
    EphemeralTimer4,
    [],
    {}
  );

  /**
   * Starts the object.
   * @param allowedRoles Optional. List of roles allowed to make state changes.
   */
  public async finalInitialize(
    allowedRoles?: UserMeetingRole[]
  ): Promise<void> {
    if (this._scope) {
      throw new Error(`EphemeralState already started.`);
    }

    // Save off allowed roles
    // this._allowedRoles = allowedRoles || [];

    // Create event scope
    this._scope = new EphemeralEventScope(this.runtime, allowedRoles);

    // TODO: make enum for event type names
    this._playEvent = new EphemeralEventTarget(
      this._scope,
      "Play",
      (event, local) => this._handlePlay(event, local)
    );
    this._pauseEvent = new EphemeralEventTarget(
      this._scope,
      "Pause",
      (event, local) => this._handlePause(event, local)
    );

    // Create object synchronizer
    this._synchronizer = new EphemeralObjectSynchronizer<ITimerState4>(
      this.id,
      this.context.containerRuntime,
      (connecting) => {
        console.log("remote state returned");
        // Return current state
        return this._currentState;
      },
      (connecting, state, sender) => {
        console.log("remote state received");
        // Check for state change
        this.remoteStateReceived(state!, sender);
      }
    );

    this._handleTimerInterval();

    return Promise.resolve();
  }

  public dispose(): void {
    super.dispose();
    if (this._synchronizer) {
      this._synchronizer.dispose();
    }
  }

  public start(duration: number): void {
    if (!this._scope) {
      throw new Error(`EphemeralState not started.`);
    }

    this.playInternal(duration, 0);
  }

  // TODO: should playing a finished timer restart it? Or should we make the user explicitly call start again?
  public play(): void {
    if (!this._scope) {
      throw new Error(`EphemeralState not started.`);
    }

    if (
      this.isStopped(this._currentState) &&
      this._currentState.position < this._currentState.duration
    ) {
      this.playInternal(
        this._currentState.duration,
        this._currentState.position
      );
    }
  }

  private playInternal(duration: number, position: number): void {
    // Broadcast state change
    const event: IPlayEvent = this._playEvent!.sendEvent({
      duration: cloneValue(duration),
      position: cloneValue(position),
    });

    // Update local state immediately
    // - The _stateUpdatedEvent won't be triggered until the state change is actually sent. If
    //   the client is disconnected this could be several seconds later.
    this.updateState(this.playEventToState(event), true);
  }

  public pause(): void {
    if (!this._scope) {
      throw new Error(`EphemeralState not started.`);
    }

    if (this.isRunning(this._currentState)) {
      const position =
        EphemeralEvent.getTimestamp() - this._currentState.timeStarted;

      // Broadcast state change
      const event = this._pauseEvent!.sendEvent({
        duration: this._currentState.duration,
        position:
          EphemeralEvent.getTimestamp() - this._currentState.timeStarted,
      });

      // Update local state immediately
      // - The _stateUpdatedEvent won't be triggered until the state change is actually sent. If
      //   the client is disconnected this could be several seconds later.
      this.updateState(this.pauseEventToState(event), true);
    }
  }

  private _handlePlay(event: IPlayEvent, local: boolean) {
    if (!local) {
      const newState = this.playEventToState(event);
      this.remoteStateReceived(newState, event.clientId!);
    }
  }

  private _handlePause(event: IPauseEvent, local: boolean) {
    if (!local) {
      const newState = this.pauseEventToState(event);
      this.remoteStateReceived(newState, event.clientId!);
    }
  }

  private remoteStateReceived(state: ITimerState4, sender: string): void {
    // TODO: role verifications
    this.updateState(state, false);
  }

  private updateState(state: ITimerState4, local: boolean) {
    const clone = cloneValue(state)!;
    if (!local) {
      clone.clientId = this._currentState.clientId;
    }

    this._currentState = clone;
    this.emit("onTimerChanged", cloneValue(clone), local);
  }

  private playEventToState(event: IPlayEvent): ITimerStateRunning {
    const newState: ITimerStateRunning = {
      timestamp: event.timestamp,
      clientId: event.clientId!, // todo: check connected first?
      duration: event.duration,
      timeStarted: event.timestamp,
    };
    return newState;
  }

  private pauseEventToState(event: IPauseEvent): ITimerStateStopped {
    const newState: ITimerStateStopped = {
      timestamp: event.timestamp,
      clientId: event.clientId!, // todo: check connected first?
      duration: event.duration,
      position: event.position
    };
    return newState;
  }

  private isRunning(state: ITimerState4): state is ITimerStateRunning {
    return "timeStarted" in state;
  }

  private isStopped(state: ITimerState4): state is ITimerStateStopped {
    return "position" in state;
  }

  private _handleTimerInterval() {
    // TODO: cancel when not needed
    const intervalCallback = () => {
      if (this.isRunning(this._currentState)) {
        const timestamp = EphemeralEvent.getTimestamp();
        if (timestamp >= this._currentState.timeStarted + this._currentState.duration) {
          const newState: ITimerStateStopped = {
            timestamp: timestamp,
            clientId: this._currentState.clientId,
            duration: this._currentState.duration,
            position: this._currentState.duration,
          };
          this.updateState(newState, true);
        } else {
          this.emit("onTick", this._currentState);
        }
      }
    };

    this._intervalId = setInterval(
      intervalCallback.bind(this),
      this._timerInterval.milliseconds
    );
  }
}

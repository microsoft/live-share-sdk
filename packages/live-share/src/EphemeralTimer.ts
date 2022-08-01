import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { EphemeralEventScope } from "./EphemeralEventScope";
import { EphemeralEventTarget } from "./EphemeralEventTarget";
import { EphemeralObjectSynchronizer } from "./EphemeralObjectSynchronizer";
import { IEphemeralEvent, UserMeetingRole } from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { cloneValue, isNewer } from "./internals/utils";
import { EphemeralEvent } from "./EphemeralEvent";

/** for all time values millis from epoch is used */
export interface ITimerState {
  timestamp: number;
  clientId: string;
  duration: number;
  position: number;
  running: boolean;
}

export interface IEphemeralTimerEvents extends IEvent {
  (
    event: "onTimerChanged",
    listener: (state: ITimerState, local: boolean) => void
  ): any;

  (
    event: "onTick",
    listener: (milliRemaining: number, local: boolean) => void
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

export class EphemeralTimer extends DataObject<{
  Events: IEphemeralTimerEvents;
}> {
  // private _logger = new EphemeralTelemetryLogger(this.runtime);
  private _allowedRoles: UserMeetingRole[] = [];
  private _currentState: ITimerState = {
    timestamp: 0,
    clientId: "",
    duration: 0,
    position: 0,
    running: false,
  } as ITimerState;

  private _scope?: EphemeralEventScope;
  private _playEvent?: EphemeralEventTarget<IPlayEvent>;
  private _pauseEvent?: EphemeralEventTarget<IPauseEvent>;
  private _synchronizer?: EphemeralObjectSynchronizer<ITimerState>;

  /**
   * The objects fluid type/name.
   */
  public static readonly TypeName = `@microsoft/live-share:EphemeralTimer4`;

  /**
   * The objects fluid type factory.
   */
  public static readonly factory = new DataObjectFactory(
    EphemeralTimer.TypeName,
    EphemeralTimer,
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
      throw new Error(`EphemeralTimer already started.`);
    }

    // Save off allowed roles
    this._allowedRoles = allowedRoles || [];

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
    this._synchronizer = new EphemeralObjectSynchronizer<ITimerState>(
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
      throw new Error(`EphemeralTimer not started.`);
    }

    this.playInternal(duration, 0);
  }

  public play(): void {
    if (!this._scope) {
      throw new Error(`EphemeralTimer not started.`);
    }

    if (
      !this._currentState.running &&
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
      duration: duration,
      position: position,
    });

    // Update local state immediately
    // - The _stateUpdatedEvent won't be triggered until the state change is actually sent. If
    //   the client is disconnected this could be several seconds later.
    this.updateState(this.playEventToState(event), true);
  }

  public pause(): void {
    if (!this._scope) {
      throw new Error(`EphemeralTimer not started.`);
    }
      
    if (this._currentState.running) {
      // Broadcast state change
      const event = this._pauseEvent!.sendEvent({
        duration: this._currentState.duration,
        position: this._currentState.position + (EphemeralEvent.getTimestamp() - this._currentState.timestamp)
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

  private remoteStateReceived(state: ITimerState, sender: string): void {
    EphemeralEvent.verifyRolesAllowed(sender, this._allowedRoles).then((allowed) => {
      // Ensure that state is allowed, newer, and not the initial state.
      if (allowed && isNewer(this._currentState, state) && state.timestamp !== 0) {
          this.updateState(state, false);
      }
    }).catch((err) => {
      console.error(err);
    });
  }

  private updateState(state: ITimerState, local: boolean) {
    const clone = cloneValue(state)!;
    if (!local) {
      clone.clientId = this._currentState.clientId;
    }

    this._currentState = clone;
    this.emit("onTimerChanged", cloneValue(clone), local);
    if (clone.running) {
      this.startTicking()
    }
  }

  private playEventToState(event: IPlayEvent): ITimerState {
    const newState: ITimerState = {
      timestamp: event.timestamp,
      clientId: event.clientId!,
      duration: event.duration,
      position: event.position,
      running: true,
    };
    return newState;
  }

  private pauseEventToState(event: IPauseEvent): ITimerState {
    const newState: ITimerState = {
      timestamp: event.timestamp,
      clientId: event.clientId!,
      duration: event.duration,
      position: event.position,
      running: false,
    };
    return newState;
  }

  private startTicking () {
    const tickCallback = () => {
      if (this._currentState.running) {
        const timestamp = EphemeralEvent.getTimestamp();
        const endTime = this._currentState.timestamp - this._currentState.position + this._currentState.duration
        if (timestamp >= endTime) {
          const newState: ITimerState = {
            timestamp: timestamp,
            clientId: this._currentState.clientId,
            duration: this._currentState.duration,
            position: this._currentState.duration,
            running: false,
          };
          this.updateState(newState, true);
        } else {
          this.emit("onTick", endTime - timestamp);
          this.scheduleAnimationFrame(tickCallback)
        }
      }
    }
    this.scheduleAnimationFrame(tickCallback)
  }

  private scheduleAnimationFrame(callback: FrameRequestCallback): void {
    if (requestAnimationFrame) {
        requestAnimationFrame(callback);
    } else {
        setTimeout(callback, 20);
    }
  }
}

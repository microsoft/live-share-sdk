import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { EphemeralEventScope } from "./EphemeralEventScope";
import { EphemeralEventTarget } from "./EphemeralEventTarget";
import { EphemeralObjectSynchronizer } from "./EphemeralObjectSynchronizer";
import { IEphemeralEvent, UserMeetingRole } from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { cloneValue, isNewer } from "./internals/utils";
import { EphemeralEvent } from "./EphemeralEvent";
import { ScopeType } from "@fluidframework/azure-client";

/** for all time values millis from epoch is used */
export interface ITimerConfig {
  configChangedAt: number;
  clientId: string;
  duration: number;
  // position when config change occured
  position: number;
  // running or not when config change occured
  running: boolean;
}

export interface IEphemeralTimerEvents extends IEvent {
  (
    event: "onTimerChanged",
    listener: (config: ITimerConfig, local: boolean) => void
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
  private _currentConfig: ITimerConfig = {
    configChangedAt: 0,
    clientId: "",
    duration: 0,
    position: 0,
    running: false,
  } as ITimerConfig;

  private _scope?: EphemeralEventScope;
  private _playEvent?: EphemeralEventTarget<IPlayEvent>;
  private _pauseEvent?: EphemeralEventTarget<IPauseEvent>;
  private _synchronizer?: EphemeralObjectSynchronizer<ITimerConfig>;

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
  public initialize(
    allowedRoles?: UserMeetingRole[]
  ): void {
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
    this._synchronizer = new EphemeralObjectSynchronizer<ITimerConfig>(
      this.id,
      this.context.containerRuntime,
      (connecting) => {
        console.log("remote state returned");
        // Return current state
        return this._currentConfig;
      },
      (connecting, state, sender) => {
        console.log("remote state received");
        // Check for state change
        this.remoteConfigReceived(state!, sender);
      }
    );
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
      !this._currentConfig.running &&
      this._currentConfig.position < this._currentConfig.duration
    ) {
      this.playInternal(
        this._currentConfig.duration,
        this._currentConfig.position
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
    this.updateConfig(this.playEventToConfig(event), true);
  }

  public pause(): void {
    if (!this._scope) {
      throw new Error(`EphemeralTimer not started.`);
    }
      
    if (this._currentConfig.running) {
      // Broadcast state change
      const event = this._pauseEvent!.sendEvent({
        duration: this._currentConfig.duration,
        position: this._currentConfig.position + (EphemeralEvent.getTimestamp() - this._currentConfig.configChangedAt)
      });

      // Update local state immediately
      this.updateConfig(this.pauseEventToConfig(event), true);
    }
  }

  private _handlePlay(event: IPlayEvent, local: boolean) {
    if (!local) {
      const newConfig = this.playEventToConfig(event);
      this.remoteConfigReceived(newConfig, event.clientId!);
    }
  }

  private _handlePause(event: IPauseEvent, local: boolean) {
    if (!local) {
      const newConfig = this.pauseEventToConfig(event);
      this.remoteConfigReceived(newConfig, event.clientId!);
    }
  }

  private remoteConfigReceived(config: ITimerConfig, sender: string): void {
    EphemeralEvent.verifyRolesAllowed(sender, this._allowedRoles).then((allowed) => {
      // Ensure that state is allowed, newer, and not the initial state.
      const existingNewerCheck = {
        timestamp: this._currentConfig.configChangedAt,
        clientId: this._currentConfig.clientId,
      }

      const newerCheck = {
        timestamp: config.configChangedAt,
        clientId: config.clientId,
      }

      if (allowed && isNewer(existingNewerCheck, newerCheck) && config.clientId) {
          this.updateConfig(config, false);
      }
    }).catch((err) => {
      console.error(err);
    });
  }

  private updateConfig(config: ITimerConfig, local: boolean) {
    const clone = cloneValue(config)!;
    this._currentConfig = clone;
    this.emit("onTimerChanged", cloneValue(clone), local);
    if (clone.running) {
      this.startTicking()
    }
  }

  private playEventToConfig(event: IPlayEvent): ITimerConfig {
    const newConfig: ITimerConfig = {
      configChangedAt: event.timestamp,
      clientId: event.clientId!,
      duration: event.duration,
      position: event.position,
      running: true,
    };
    return newConfig;
  }

  private pauseEventToConfig(event: IPauseEvent): ITimerConfig {
    const newConfig: ITimerConfig = {
      configChangedAt: event.timestamp,
      clientId: event.clientId!,
      duration: event.duration,
      position: event.position,
      running: false,
    };
    return newConfig;
  }

  private startTicking () {
    function endTimeFromConfig (config: ITimerConfig): number {
      return config.configChangedAt - config.position + config.duration
    }
    const tickCallback = () => {
      if (this._currentConfig.running) {
        const timestamp = EphemeralEvent.getTimestamp();
        const endTime = endTimeFromConfig(this._currentConfig)
        if (timestamp >= endTime) {
          const newConfig: ITimerConfig = {
            configChangedAt: timestamp,
            clientId: this._scope!.clientId!,
            duration: this._currentConfig.duration,
            position: this._currentConfig.duration,
            running: false,
          };
          this.updateConfig(newConfig, true);
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

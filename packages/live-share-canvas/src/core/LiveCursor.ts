import { IPoint } from "./Geometry.js";
import { IUserInfo } from "./LiveCanvas-interfaces.js";

/**
 * Represents a live (shared) cursor. Applications that want to customize
 * the appearance of cursors on the screen should extend `LiveCursor` and
 * override its `renderedElement` property to return a custom HTML element.
 */
export abstract class LiveCursor {
    private _renderedElement?: HTMLElement;
    private _lastUpdated = Date.now();
    private _userInfo?: IUserInfo;

    protected abstract internalRender(): HTMLElement;

    /**
     * Initializes a new instance of `LiveCursor`.
     * @param info The cursor info.
     */
    constructor(
        public readonly clientId: string,
        _userInfo?: IUserInfo
    ) {
        this._userInfo = _userInfo;
    }

    /**
     * Updates the position of the cursor.
     * @param position The new position of the cursor.
     */
    setPosition(position: IPoint) {
        this._lastUpdated = Date.now();

        if (this.renderedElement) {
            this.renderedElement.style.left = position.x + "px";
            this.renderedElement.style.top = position.y + "px";
        }
    }

    /**
     * @hidden
     * Overwrite the user info used for rendering displayName.
     * Normally should let LiveCanvas set this value, which comes from the host and is trusted.
     * Values set here will be overwritten by values from the host
     */
    public set userInfo(value: IUserInfo | undefined) {
        this._userInfo = value;
    }

    public get userInfo(): IUserInfo | undefined {
        return this._userInfo;
    }

    /**
     * Gets the amount of time the cursor has been idle.
     */
    get idleTime() {
        return Date.now() - this._lastUpdated;
    }

    /**
     * Returns an HTML element representing the cursor. Applications
     * that extend `LiveCursor` must override `get renderedElement`
     * to return a custom built HTML element.
     */
    get renderedElement(): HTMLElement {
        if (!this._renderedElement) {
            this._renderedElement = this.internalRender();
        }

        return this._renderedElement;
    }
}

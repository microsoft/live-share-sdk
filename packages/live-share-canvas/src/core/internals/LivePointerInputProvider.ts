import {
    IMulticastEvent,
    IPointerEvent,
    IPointerMoveEvent,
    InputProvider,
} from "../../input/index.js";

/**
 * @internal
 * Decorator for InputProvider that ensures local user has correct
 * roles before activating delegate input provider.
 */
export class LivePointerInputProvider extends InputProvider {
    constructor(
        private delegate: InputProvider,
        private verifyLocalUserRoles: () => Promise<boolean>
    ) {
        super();
    }
    activate() {
        this.verifyLocalUserRoles().then((allowed) => {
            if (allowed) {
                this.delegate.activate();
            } else {
                this.delegate.deactivate();
            }
        });
    }

    deactivate() {
        this.delegate.deactivate();
    }

    get isActive(): boolean {
        return this.delegate.isActive;
    }

    get pointerDown(): IMulticastEvent<IPointerEvent> {
        return this.delegate.pointerDown;
    }

    get pointerMove(): IMulticastEvent<IPointerMoveEvent> {
        return this.delegate.pointerMove;
    }

    get pointerUp(): IMulticastEvent<IPointerEvent> {
        return this.delegate.pointerUp;
    }

    get pointerEnter(): IMulticastEvent<IPointerEvent> {
        return this.delegate.pointerEnter;
    }

    get pointerLeave(): IMulticastEvent<IPointerEvent> {
        return this.delegate.pointerLeave;
    }
}

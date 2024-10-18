import { TimeInterval } from "@microsoft/live-share";

function getScaledPriorityTimeMs(
    minMilliseconds: number,
    hasPriority: boolean,
    shouldPrioritize: boolean,
    scaleBy: number
): number {
    if (!shouldPrioritize) return minMilliseconds;
    if (hasPriority) return minMilliseconds;
    return minMilliseconds * scaleBy;
}

/**
 * @hidden
 * Time interval that can scale based on a scaling function.
 */
export class PriorityTimeInterval extends TimeInterval {
    /**
     * If true, local user has priority and will have the lowest possible millesecond value.
     */
    public hasPriority: boolean;
    /**
     * If true, milliseconds will be scaled when {@link hasPriority} is false.
     */
    public shouldPrioritize: boolean;
    /**
     * Function to get the scale ratio.
     */
    private getScaleBy: () => number;
    /**
     * Time interval that can scale based on a scaling function.
     *
     * @param defaultMilliseconds the default minimum milliseconds
     * @param getScaleByFn a function to scale the milliseconds by when {@link hasPriority} is false and {@link shouldPrioritize} is true.
     * @param defaultHasPriority the default {@link hasPriority} value
     * @param defaultShouldPrioritize the default {@link shouldPrioritize} value
     */
    constructor(
        defaultMilliseconds: number,
        getScaleByFn: () => number,
        defaultHasPriority: boolean = false,
        defaultShouldPrioritize: boolean = true
    ) {
        super(defaultMilliseconds);
        this.hasPriority = defaultHasPriority;
        this.shouldPrioritize = defaultShouldPrioritize;
        this.getScaleBy = getScaleByFn;
    }

    public get milliseconds(): number {
        return getScaledPriorityTimeMs(
            this._milliseconds,
            this.hasPriority,
            this.shouldPrioritize,
            this.getScaleBy()
        );
    }

    public set milliseconds(value: number) {
        this._milliseconds = value;
    }

    public get minMilliseconds(): number {
        return this._milliseconds;
    }

    public get maxMilliseconds(): number {
        return getScaledPriorityTimeMs(
            this._milliseconds,
            false,
            this.shouldPrioritize,
            this.getScaleBy()
        );
    }
}

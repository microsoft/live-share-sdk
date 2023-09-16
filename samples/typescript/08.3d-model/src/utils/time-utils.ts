export function millisecondsToTime(ms: number): [number, number, number] {
    let hours: number, minutes: number, seconds: number;

    // Convert milliseconds to total seconds
    seconds = Math.floor(ms / 1000);

    // Get hours
    hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    // Get minutes
    minutes = Math.floor(seconds / 60);

    // Get remaining seconds
    seconds %= 60;

    // Format the result as HH:MM:SS
    return [hours, minutes, seconds];
}

export function timeToMilliseconds([hours, minutes, seconds]: [
    number,
    number,
    number
]): number {
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

export function unitToDisplayValue(value: number): string {
    return value >= 10 ? `${value}` : `0${value}`;
}

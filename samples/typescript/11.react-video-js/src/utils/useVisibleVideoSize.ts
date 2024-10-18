import { useEffect, useRef, useState } from "react";

export interface VideoSize {
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    fScaleToTargetWidth: boolean;
}

export const useVisibleVideoSize = (
    viewportWidth: number,
    viewportHeight: number
) => {
    const videoSizeRef = useRef<VideoSize>();
    const [videoSize, setVideoSize] = useState(videoSizeRef.current);
    // Effect for calculating the rectangle that matches the visible video size
    useEffect(() => {
        const result = {
            width: 0,
            height: 0,
            xOffset: 0,
            yOffset: 0,
            fScaleToTargetWidth: true,
        };
        const videoWidth = 1920;
        const videoHeight = 1080;

        const scaleX1 = viewportWidth;
        const scaleY1 = (videoHeight * viewportWidth) / videoWidth;

        // scale to the target height
        const scaleX2 = (videoWidth * viewportHeight) / videoHeight;
        const scaleY2 = viewportHeight;

        // now figure out which one we should use
        let fScaleOnWidth = scaleX2 > viewportWidth;
        if (fScaleOnWidth) {
            fScaleOnWidth = true;
        } else {
            fScaleOnWidth = false;
        }

        if (fScaleOnWidth) {
            result.width = Math.floor(scaleX1);
            result.height = Math.floor(scaleY1);
            result.fScaleToTargetWidth = true;
        } else {
            result.width = Math.floor(scaleX2);
            result.height = Math.floor(scaleY2);
            result.fScaleToTargetWidth = false;
        }
        result.xOffset = Math.floor((viewportWidth - result.width) / 2);
        result.yOffset = Math.floor((viewportHeight - result.height) / 2);
        if (
            result.xOffset !== videoSizeRef.current?.xOffset ||
            result.yOffset !== videoSizeRef.current?.yOffset
        ) {
            videoSizeRef.current = result;
            setVideoSize(videoSizeRef.current);
        }
    }, [viewportWidth, viewportHeight, videoSizeRef]);

    return videoSize;
};

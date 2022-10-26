/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback, useRef, FC, SyntheticEvent, ReactEventHandler, MutableRefObject } from "react";
import { PositioningImperativeRef, Slider, Slot } from "@fluentui/react-components";
import { Tooltip } from "@fluentui/react-components";
import { getProgressBarStyles } from "../styles/styles";
import { debounce } from "lodash";
import useResizeObserver from "use-resize-observer";
import { getFlexItemStyles } from "../styles/layouts";
import { formatTimeValue } from "../utils/format";
import React from "react";

const PlayerProgressBar: FC<{
  currentTime: number,
  duration: number, 
  isPlaybackDisabled: boolean, 
  onSeek: (time: number) => void
}> = ({
  currentTime,
  duration,
  isPlaybackDisabled,
  onSeek
}) => {
  const toolTipPositioningRef = useRef<PositioningImperativeRef>();
  const sliderRef = useRef<HTMLInputElement>();
  const [dimension, setDimensions] = useState<DOMRect>();
  const [toolTipContent, setToolTipContent] = useState("0:00");

  const { ref: resizeRef, width = 1, height = 1 } = useResizeObserver();

  const [localCurrentTime, setLocalCurrentTime] = useState(0.0);
  const [isSeeking, setIsSeeking] = useState(false);

  const styles = getProgressBarStyles();
  const flexItemStyles = getFlexItemStyles();

  const onDidSeek = useCallback(() => {
      onSeek(localCurrentTime);
      setTimeout(() => {
        setIsSeeking(false);
      }, 500);
    },
    [onSeek, setIsSeeking, localCurrentTime]
  );

  // eslint-disable-next-line
  const debouncedSeek = useCallback(debounce(onDidSeek, 200), [onDidSeek, localCurrentTime]);

  useEffect(() => {
    if (!isSeeking && currentTime !== localCurrentTime) {
      setLocalCurrentTime(currentTime);
    }
  }, [currentTime, localCurrentTime, isSeeking]);

  useEffect(() => {
    if (sliderRef.current && width > 1 && height > 1) {
      setDimensions(sliderRef.current.getBoundingClientRect());
    }
  }, [sliderRef, duration, width, height]);

  const onMouseMove: ReactEventHandler<HTMLElement> = (e: SyntheticEvent<HTMLElement, MouseEvent>) => {
    if (dimension) {
      const xPosition = Math.min(Math.max(e.nativeEvent.clientX, dimension.left), dimension.right - 4);
      const distanceFromOrigin = xPosition - dimension.left;
      const mousePos = (distanceFromOrigin / dimension.width) * 100;
      const hoverTime = Math.max(0, Math.min(Math.round(duration * (mousePos / 100)), duration));
      const scrollOffSet = 0;

      setToolTipContent(formatTimeValue(hoverTime));

      toolTipPositioningRef.current?.setTarget({
        getBoundingClientRect: getRect(xPosition, dimension.top - scrollOffSet)
      });
    }
  };

  const onTouchMove: ReactEventHandler<HTMLElement> = (e: SyntheticEvent<HTMLElement, TouchEvent>) => {
    if (dimension) {
      const xPosition = Math.min(Math.max(e.nativeEvent.touches[0].clientX, dimension.left), dimension.right - 4);
      const distanceFromOrigin = xPosition - dimension.left;
      const mousePos = (distanceFromOrigin / dimension.width) * 100;
      const hoverTime = Math.max(0, Math.min(Math.round(duration * (mousePos / 100)), duration));
      const scrollOffSet = 0;

      setToolTipContent(formatTimeValue(hoverTime));

      toolTipPositioningRef.current?.setTarget({
        getBoundingClientRect: getRect(xPosition, dimension.top - scrollOffSet)
      });
    }
  };

  const durationToDivideBy = duration === 0 ? 100 : duration;
  const bufferLoadedPercent = 0;

  return (
    <div className={flexItemStyles.noShrink} ref={resizeRef}>
      <div className={styles.pageEl}>
        <Tooltip withArrow positioning={{ positioningRef: toolTipPositioningRef as MutableRefObject<PositioningImperativeRef> }} content={toolTipContent} relationship="label">
          <Slider
            ref={sliderRef as MutableRefObject<HTMLInputElement>}
            min={0}
            max={durationToDivideBy}
            value={localCurrentTime}
            disabled={isPlaybackDisabled}
            // TODO: ts errors
            // style={
            //   {
            //     "--oneplayer-play-progress-percent": `${(localCurrentTime / durationToDivideBy) * 100}%`,
            //     "--oneplayer-buff-progress-percent": `${
            //       ((duration * bufferLoadedPercent) / durationToDivideBy) * 100
            //     }%`,
            //     "--fui-slider-thumb-size": "1rem",
            //   }
            // }
            input={{
              className: styles.input,
              "aria-valuemin": 0,
              "aria-valuemax": duration,
              "aria-label": "progress bar",
              "aria-live": "polite",
              role: "slider",
            }}
            rail={{
              className: styles.rail,
            }}
            className={styles.root}
            thumb={{ className: styles.thumb }}
            onChange={(ev, data) => {
              setIsSeeking(true);
              setLocalCurrentTime(data.value);
            }}
            onMouseMove={onMouseMove}
            onMouseDown={() => {
              setIsSeeking(true);
            }}
            onTouchStart={(e) => {
              setIsSeeking(true);
            }}
            onTouchMove={onTouchMove}
            onTouchEnd={(e) => {
              debouncedSeek();
            }}
            onMouseUp={() => {
              debouncedSeek();
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};

const getRect = (x = 0, y = 0) => {
  return () => ({
    x: x,
    y: y,
    width: 0,
    height: 0,
    top: y,
    right: x,
    bottom: y,
    left: x,
  });
};

export default PlayerProgressBar;

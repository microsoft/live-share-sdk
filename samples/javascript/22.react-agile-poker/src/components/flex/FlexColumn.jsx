import PropTypes from "prop-types";
import { forwardRef } from "react";
import { mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "./flex-styles";

export const FlexColumn = forwardRef((props, ref) => {
    const {
        children,
        className,
        fill,
        gap,
        hAlign,
        name,
        role,
        scroll,
        spaceBetween,
        style,
        transparent,
        vAlign,
        onClick,
        onMouseMove,
    } = props;
    const flexColumnStyles = getFlexColumnStyles();

    const isHidden = role === "presentation";

    const mergedClasses = mergeClasses(
        flexColumnStyles.root,
        fill === "both" && flexColumnStyles.fill,
        fill === "height" && flexColumnStyles.fillH,
        fill === "view" && flexColumnStyles.fillV,
        fill === "view-height" && flexColumnStyles.fillVH,
        fill === "width" && flexColumnStyles.fillW,
        gap && flexColumnStyles.gapReset,
        gap === "smaller" && flexColumnStyles.gapSmaller,
        gap === "small" && flexColumnStyles.gapSmall,
        gap === "medium" && flexColumnStyles.gapMedium,
        gap === "large" && flexColumnStyles.gapLarge,
        hAlign === "center" && flexColumnStyles.hAlignCenter,
        hAlign === "end" && flexColumnStyles.hAlignEnd,
        hAlign === "start" && flexColumnStyles.hAlignStart,
        isHidden && flexColumnStyles.defaultCursor,
        isHidden && flexColumnStyles.pointerEvents,
        scroll && flexColumnStyles.scroll,
        spaceBetween && flexColumnStyles.spaceBetween,
        transparent && flexColumnStyles.transparent,
        vAlign === "center" && flexColumnStyles.vAlignCenter,
        vAlign === "end" && flexColumnStyles.vAlignEnd,
        vAlign === "start" && flexColumnStyles.vAlignStart,
        className && className
    );

    return (
        <div
            ref={ref}
            aria-hidden={isHidden}
            data-name={name ? name : undefined}
            className={mergedClasses}
            role={role && role}
            style={style}
            tabIndex={isHidden ? -1 : 0}
            onClick={onClick}
            onMouseMove={onMouseMove}
        >
            {children}
        </div>
    );
});
FlexColumn.displayName = "FlexColumn";

FlexColumn.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    fill: PropTypes.oneOf(["both", "height", "width", "view"]),
    gap: PropTypes.oneOf(["smaller", "small", "medium", "large"]),
    hAlign: PropTypes.oneOf(["start", "center", "end"]),
    name: PropTypes.string,
    role: PropTypes.string,
    isHidden: PropTypes.bool,
    spaceBetween: PropTypes.bool,
    scroll: PropTypes.bool,
    style: PropTypes.object,
    transparent: PropTypes.bool,
    vAlign: PropTypes.oneOf(["start", "center", "end"]),
    onClick: PropTypes.func,
    onMouseMove: PropTypes.func,
};

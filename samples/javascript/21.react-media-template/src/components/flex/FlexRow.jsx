import PropTypes from "prop-types";
import { forwardRef } from "react";
import { mergeClasses } from "@fluentui/react-components";
import { getFlexRowStyles } from "./flex-styles";

export const FlexRow = forwardRef((props, ref) => {
    const {
        children,
        // Merged classes from parent
        className,
        columnOnSmallScreen,
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
        wrap,
    } = props;

    const flexRowStyles = getFlexRowStyles();

    const isHidden = role === "presentation";

    const mergedClasses = mergeClasses(
        flexRowStyles.root,
        fill === "both" && flexRowStyles.fill,
        fill === "height" && flexRowStyles.fillH,
        fill === "view" && flexRowStyles.fillV,
        fill === "view-height" && flexRowStyles.fillVH,
        fill === "width" && flexRowStyles.fillW,
        gap === "smaller" && flexRowStyles.gapSmaller,
        gap === "small" && flexRowStyles.gapSmall,
        gap === "medium" && flexRowStyles.gapMedium,
        gap === "large" && flexRowStyles.gapLarge,
        hAlign === "center" && flexRowStyles.hAlignCenter,
        hAlign === "end" && flexRowStyles.hAlignEnd,
        hAlign === "start" && flexRowStyles.hAlignStart,
        isHidden && flexRowStyles.defaultCursor,
        isHidden && flexRowStyles.pointerEvents,
        scroll && flexRowStyles.scroll,
        spaceBetween && flexRowStyles.spaceBetween,
        transparent && flexRowStyles.transparent,
        vAlign === "center" && flexRowStyles.vAlignCenter,
        vAlign === "end" && flexRowStyles.vAlignEnd,
        vAlign === "start" && flexRowStyles.vAlignStart,
        wrap && flexRowStyles.wrap,
        columnOnSmallScreen && flexRowStyles.columnOnSmallScreen,
        className && className
    );
    return (
        <div
            aria-hidden={isHidden}
            data-name={name ? name : undefined}
            className={mergedClasses}
            ref={ref}
            role={role && role}
            style={style}
            tabIndex={isHidden ? -1 : 0}
        >
            {children}
        </div>
    );
});
FlexRow.displayName = "FlexColumn";

FlexRow.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    columnOnSmallScreen: PropTypes.bool,
    fill: PropTypes.oneOf(["both", "height", "width", "view"]),
    gap: PropTypes.oneOf(["smaller", "small", "medium", "large"]),
    hAlign: PropTypes.oneOf(["start", "center", "end"]),
    name: PropTypes.string,
    onClick: PropTypes.func,
    onMouseMove: PropTypes.func,
    role: PropTypes.string,
    scroll: PropTypes.bool,
    spaceBetween: PropTypes.bool,
    style: PropTypes.object,
    transparent: PropTypes.bool,
    vAlign: PropTypes.oneOf(["start", "center", "end"]),
    wrap: PropTypes.bool,
};

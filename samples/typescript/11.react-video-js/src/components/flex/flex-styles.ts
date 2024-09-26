import { MouseEventHandler, ReactNode } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";

/** Send Flex style options via FlexColumn or FlexRow props */
export type FlexOptions = {
    children?: ReactNode;
    className?: string;
    fill?: "both" | "height" | "width" | "view" | "view-height";
    gap?: "smaller" | "small" | "medium" | "large";
    hAlign?: "start" | "center" | "end";
    inline?: boolean;
    name?: string;
    role?: string;
    spaceBetween?: boolean;
    style?: any;
    transparent?: boolean; // refactor for other background colors
    vAlign?: "start" | "center" | "end";
    scroll?: boolean;
    onClick?: MouseEventHandler;
};

export const getFlexRowStyles = makeStyles({
    root: {
        display: "flex",
        height: "auto",
        /** Fix for flex containers:
         * minHeight/Width ensures padding is respected when
         * computing height wrt child components */
        minHeight: 0,
        minWidth: 0,
    },
    defaultCursor: {
        cursor: "default",
    },
    fill: {
        width: "100%",
        height: "100%",
    },
    fillH: {
        height: "100%",
    },
    // fill view
    fillV: {
        height: "100vh",
        width: "100vw",
        overflowY: "hidden",
        "@supports(height: 100svh)": {
            height: "100svh",
        },
    },
    // fill view (height only)
    fillVH: {
        height: "100vh",
        overflowY: "hidden",
        "@supports(height: 100svh)": {
            height: "100svh",
        },
    },
    fillW: {
        width: "100%",
    },
    gapSmaller: {
        "> :not(:last-child)": {
            marginRight: "0.5rem",
        },
    },
    gapSmall: {
        "> :not(:last-child)": {
            marginRight: "1rem",
        },
    },
    gapMedium: {
        "> :not(:last-child)": {
            marginRight: "1.5rem",
        },
    },
    gapLarge: {
        "> :not(:last-child)": {
            marginRight: "3rem",
        },
    },
    scroll: {
        overflowX: "auto",
        overflowY: "hidden",
        msOverflowStyle: "auto",
        "::-webkit-scrollbar": {
            height: "16px",
        },
        "::-webkit-scrollbar-track": {
            borderRadiusStartStart: "8px",
            borderRadiusStartEnd: "8px",
            borderRadiusEndStart: "8px",
            borderRadiusEndEnd: "8px",
            backgroundColor: tokens.colorNeutralBackground3,
            borderLeftWidth: "1px",
            borderLeftStyle: "solid",
            borderLeftColor: tokens.colorNeutralBackground3,
            borderRightWidth: "1px",
            borderRightStyle: "solid",
            borderRightColor: tokens.colorNeutralBackground3,
            borderTopWidth: "1px",
            borderTopStyle: "solid",
            borderTopColor: tokens.colorNeutralBackground3,
            borderBottomWidth: "1px",
            borderBottomStyle: "solid",
            borderBottomColor: tokens.colorNeutralBackground3,
        },
        "::-webkit-scrollbar-thumb": {
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
            backgroundColor: tokens.colorNeutralForeground3,
            borderLeftWidth: "4px",
            borderLeftStyle: "solid",
            borderLeftColor: tokens.colorNeutralBackground3,
            borderRightWidth: "4px",
            borderRightStyle: "solid",
            borderRightColor: tokens.colorNeutralBackground3,
            borderTopWidth: "4px",
            borderTopStyle: "solid",
            borderTopColor: tokens.colorNeutralBackground3,
            borderBottomWidth: "4px",
            borderBottomStyle: "solid",
            borderBottomColor: tokens.colorNeutralBackground3,
            ":hover": {
                backgroundColor: tokens.colorNeutralForeground3Hover,
            },
            ":focus": {
                backgroundColor: tokens.colorNeutralForeground3Pressed,
            },
        },
    },
    spaceBetween: {
        justifyContent: "space-between",
    },
    hAlignStart: {
        justifyContent: "start",
    },
    hAlignCenter: {
        justifyContent: "center",
    },
    hAlignEnd: {
        justifyContent: "end",
    },
    inline: {
        display: "inline-flex",
    },
    pointerEvents: {
        pointerEvents: "none",
    },
    transparent: {
        backgroundColor: "transparent",
    },
    vAlignStart: {
        alignItems: "start",
    },
    vAlignCenter: {
        alignItems: "center",
    },
    vAlignEnd: {
        alignItems: "end",
    },
    wrap: {
        flexWrap: "wrap",
    },
    columnOnSmallScreen: {
        "@media only screen and (max-width: 720px)": {
            flexDirection: "column",
            height: "auto",
            /** Fix for flex containers:
             * minHeight/Width ensures padding is respected when
             * computing height wrt child components */
            minHeight: 0,
            minWidth: 0,
        },
    },
});

export const getFlexColumnStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "auto",
        /** Fix for flex containers:
         * minHeight/Width ensures padding is respected when
         * computing height wrt child components */
        minHeight: 0,
        minWidth: 0,
    },
    defaultCursor: {
        cursor: "default",
    },
    fill: {
        width: "100%",
        height: "100%",
    },
    fillH: {
        height: "100%",
    },
    // fill view
    fillV: {
        width: "100vw",
        height: "100vh",
        overflowY: "hidden",
        "@supports(height: 100svh)": {
            height: "100svh",
        },
    },
    // fill view (height only)
    fillVH: {
        height: "100vh",
        overflowY: "hidden",
        "@supports(height: 100svh)": {
            height: "100svh",
        },
    },
    fillW: {
        width: "100%",
    },
    // Needed to reset top margin when using <p> within a <FlexColumn>
    gapReset: {
        "> :not(:last-child)": {
            marginTop: "0rem",
        },
    },
    gapSmaller: {
        "> :not(:last-child)": {
            marginBottom: "0.5rem",
        },
    },
    gapSmall: {
        "> :not(:last-child)": {
            marginBottom: "1rem",
        },
    },
    gapMedium: {
        "> :not(:last-child)": {
            marginBottom: "1.5rem",
        },
    },
    gapLarge: {
        "> :not(:last-child)": {
            marginBottom: "3rem",
        },
    },
    spaceBetween: {
        justifyContent: "space-between",
    },
    hAlignStart: {
        alignItems: "start",
    },
    hAlignCenter: {
        alignItems: "center",
    },
    hAlignEnd: {
        alignItems: "end",
    },
    inline: {
        display: "inline-flex",
    },
    isSidePanel: {
        maxWidth: "24rem",
    },
    pointerEvents: {
        pointerEvents: "none",
    },
    scroll: {
        overflowY: "auto",
        msOverflowStyle: "auto",
        maxHeight: "100vh",
        "::-webkit-scrollbar": {
            width: "16px",
        },
        "::-webkit-scrollbar-track": {
            borderRadiusStartStart: "8px",
            borderRadiusStartEnd: "8px",
            borderRadiusEndStart: "8px",
            borderRadiusEndEnd: "8px",
            backgroundColor: tokens.colorNeutralBackground3,
            borderLeftWidth: "1px",
            borderLeftStyle: "solid",
            borderLeftColor: tokens.colorNeutralBackground3,
            borderRightWidth: "1px",
            borderRightStyle: "solid",
            borderRightColor: tokens.colorNeutralBackground3,
            borderTopWidth: "1px",
            borderTopStyle: "solid",
            borderTopColor: tokens.colorNeutralBackground3,
            borderBottomWidth: "1px",
            borderBottomStyle: "solid",
            borderBottomColor: tokens.colorNeutralBackground3,
        },
        "::-webkit-scrollbar-thumb": {
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
            backgroundColor: tokens.colorNeutralForeground3,
            borderLeftWidth: "4px",
            borderLeftStyle: "solid",
            borderLeftColor: tokens.colorNeutralBackground3,
            borderRightWidth: "4px",
            borderRightStyle: "solid",
            borderRightColor: tokens.colorNeutralBackground3,
            borderTopWidth: "4px",
            borderTopStyle: "solid",
            borderTopColor: tokens.colorNeutralBackground3,
            borderBottomWidth: "4px",
            borderBottomStyle: "solid",
            borderBottomColor: tokens.colorNeutralBackground3,
            ":hover": {
                backgroundColor: tokens.colorNeutralForeground3Hover,
            },
            ":focus": {
                backgroundColor: tokens.colorNeutralForeground3Pressed,
            },
        },
    },
    transparent: {
        backgroundColor: "transparent",
    },
    vAlignStart: {
        justifyContent: "start",
    },
    vAlignCenter: {
        justifyContent: "center",
    },
    vAlignEnd: {
        justifyContent: "end",
    },
});
export const getFlexItemStyles = makeStyles({
    grow: {
        flexGrow: 1,
    },
    noShrink: {
        flexShrink: 0,
    },
});

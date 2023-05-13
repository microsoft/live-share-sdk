import { makeStyles, tokens } from "@fluentui/react-components";

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
    fill: {
        width: "100%",
        height: "100%",
    },
    gap: {
        // this is temporary
        marginRight: "0.5rem",
    },
    marginSpacer: {
        "> :not(:last-child)": {
            marginRight: "0.5rem",
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
    fill: {
        width: "100%",
        height: "100%",
    },
    gap: {
        marginBottom: "0.5rem",
    },
    marginSpacer: {
        "> :not(:last-child)": {
            marginBottom: "0.5rem",
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
    vAlignStart: {
        justifyContent: "start",
    },
    vAlignCenter: {
        justifyContent: "center",
    },
    vAlignEnd: {
        justifyContent: "end",
    },
    scroll: {
        overflowY: "auto",
        msOverflowStyle: "auto",
        maxHeight: "100vh",
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
});
export const getFlexItemStyles = makeStyles({
    grow: {
        flexGrow: 1,
    },
    noShrink: {
        flexShrink: 0,
    },
});

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
            width: "12px",
        },
        "::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
        },
        "::-webkit-scrollbar-thumb": {
            // backgroundColor: tokens.colorPaletteCharcoalBackground3,
            // borderLeftColor: tokens.colorPaletteCharcoalBackground2,
            borderLeftWidth: "4px",
            borderLeftStyle: "solid",
            backgroundClip: "padding-box",
            borderTopLeftRadius: "5px",
            borderTopRightRadius: "4px",
            borderBottomLeftRadius: "5px",
            borderBottomRightRadius: "4px",
        },
        "::-webkit-scrollbar-thumb:hover": {
            // backgroundColor: tokens.colorPaletteCharcoalForeground3,
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

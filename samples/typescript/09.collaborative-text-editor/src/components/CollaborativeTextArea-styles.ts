import { makeStyles } from "@fluentui/react-components";

export const getCursorContainerStyles = makeStyles({
    root: {
        pointerEvents: "none",
        color: "transparent !important",
        height: "100%",
        position: "absolute",
        bottom: 0,
        top: 0,
        right: 0,
        left: 0,
        whiteSpace: "pre-wrap",
    },
});

export const getCursorSpanStyles = makeStyles({
    root: {
        position: "relative",
        width: "0",
    },
});

export const getCursorStyles = makeStyles({
    root: {
        position: "absolute",
        top: 0,
        // Adjust this value as needed to center the cursor
        left: 0,
        width: "2px",
        paddingTop: "3px",
        paddingBottom: "2px",
        boxSizing: "border-box",
        pointerEvents: "all",
    },
});

export const getCursorInnerStyles = makeStyles({
    root: {
        opacity: 0.8,
        width: "100%",
        height: "100%",
        boxSizing: "content-box",
    },
});

export const getCursorAvatarDotStyles = makeStyles({
    root: {
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 1,
        width: "4px",
        height: "4px",
        borderTopLeftRadius: "2px",
        borderTopRightRadius: "2px",
        borderBottomLeftRadius: "2px",
        borderBottomRightRadius: "2px",
        boxSizing: "content-box",
    },
});

export const getCursorAvatarStyles = makeStyles({
    root: {
        position: "absolute",
        top: "-3px",
        left: 0,
        bottom: 0,
        verticalAlign: "top",
        transitionDuration: "0.25s",
        transitionTimingFunction: "ease-in",
        transitionProperty: "opacity",
        opacity: 1,
    },
    hidden: {
        transitionDuration: "0.25s",
        transitionTimingFunction: "ease-out",
        transitionProperty: "opacity",
        opacity: 0,
        width: "0px",
    },
});

export const getCursorHoverStyles = makeStyles({
    root: {
        position: "absolute",
        top: "-4px",
        left: 0,
        verticalAlign: "top",
        transitionDuration: "0.25s",
        transitionTimingFunction: "ease-in",
        transitionProperty: "opacity",
        opacity: 1,
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
        color: "white",
        fontSize: "0.75rem",
        lineHeight: "0.8rem",
        paddingLeft: "6px",
        paddingRight: "6px",
        paddingTop: "3px",
        paddingBottom: "3px",
        pointerEvents: "none",
    },
    hidden: {
        transitionDuration: "0.25s",
        transitionTimingFunction: "ease-out",
        transitionProperty: "opacity",
        opacity: 0,
    },
});

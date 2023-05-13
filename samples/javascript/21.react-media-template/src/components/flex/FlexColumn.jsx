import PropTypes from "prop-types";
import { mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "./FlexStyles";

export const FlexColumn = (props) => {
    const {
        children,
        className,
        fill,
        hAlignCenter,
        hAlignEnd,
        hAlignStart,
        marginSpacer,
        scroll,
        spaceBetween,
        style,
        vAlignCenter,
        vAlignEnd,
        vAlignStart,
        onMouseMove,
        onClick,
    } = props;
    const flexColumnStyles = getFlexColumnStyles();
    const mergedClasses = mergeClasses(
        flexColumnStyles.root,
        fill ? flexColumnStyles.fill : "",
        hAlignCenter ? flexColumnStyles.hAlignCenter : "",
        hAlignEnd ? flexColumnStyles.hAlignEnd : "",
        hAlignStart ? flexColumnStyles.hAlignStart : "",
        marginSpacer ? flexColumnStyles.marginSpacer : "",
        scroll ? flexColumnStyles.scroll : "",
        spaceBetween ? flexColumnStyles.spaceBetween : "",
        vAlignCenter ? flexColumnStyles.vAlignCenter : "",
        vAlignEnd ? flexColumnStyles.vAlignEnd : "",
        vAlignStart ? flexColumnStyles.vAlignStart : "",
        className ?? ""
    );

    return (
        <div
            className={mergedClasses}
            style={style}
            onMouseMove={onMouseMove}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

FlexColumn.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    fill: PropTypes.oneOf(["both", "height", "width", "view"]),
    gap: PropTypes.oneOf(["smaller" | "small" | "medium" | "large"]),
    hAlign: PropTypes.oneOf(["start" | "center" | "end"]),
    inline: PropTypes.bool,
    name: PropTypes.string,
    role: PropTypes.string,
    spaceBetween: PropTypes.bool,
    style: PropTypes.object,
    transparent: PropTypes.bool,
    vAlign: PropTypes.oneOf(["start" | "center" | "end"]),
};

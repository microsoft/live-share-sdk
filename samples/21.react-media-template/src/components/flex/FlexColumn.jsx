import PropTypes from "prop-types";
import { mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "./FlexStyles";

export const FlexColumn = (props) => {
    const {
        children,
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
    } = props;
    const flexColumnStyles = getFlexColumnStyles();
    const mergedClasses = mergeClasses(
        flexColumnStyles.root,
        fill ? flexColumnStyles.fill : PropTypes.oneOf([""]),
        hAlignCenter ? flexColumnStyles.hAlignCenter : "",
        hAlignEnd ? flexColumnStyles.hAlignEnd : "",
        hAlignStart ? flexColumnStyles.hAlignStart : "",
        marginSpacer ? flexColumnStyles.marginSpacer : "",
        scroll ? flexColumnStyles.scroll : "",
        spaceBetween ? flexColumnStyles.spaceBetween : "",
        vAlignCenter ? flexColumnStyles.vAlignCenter : "",
        vAlignEnd ? flexColumnStyles.vAlignEnd : "",
        vAlignStart ? flexColumnStyles.vAlignStart : ""
    );

    return (
        <div className={mergedClasses} style={style}>
            {children}
        </div>
    );
};

FlexColumn.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    fill: PropTypes.oneOf(["both", "height", "width", "view"]),
    gap: PropTypes.oneOf(["smaller", "small", "medium", "large"]),
    hAlign: PropTypes.oneOf(["start", "center", "end"]),
    inline: PropTypes.bool,
    name: PropTypes.string,
    role: PropTypes.string,
    spaceBetween: PropTypes.bool,
    style: PropTypes.object,
    transparent: PropTypes.bool,
    vAlign: PropTypes.oneOf(["start", "center", "end"]),
};

import PropTypes from "prop-types";
import { mergeClasses } from "@fluentui/react-components";
import { getFlexRowStyles } from "./FlexStyles";

export const FlexRow = (props) => {
    const {
        children,
        fill,
        hAlignCenter,
        hAlignEnd,
        hAlignStart,
        marginSpacer,
        spaceBetween,
        style,
        vAlignCenter,
        vAlignEnd,
        vAlignStart,
        wrap,
    } = props;
    const flexRowStyles = getFlexRowStyles();
    const mergedClasses = mergeClasses(
        flexRowStyles.root,
        fill ? flexRowStyles.fill : "",
        hAlignCenter ? flexRowStyles.hAlignCenter : "",
        hAlignEnd ? flexRowStyles.hAlignEnd : "",
        hAlignStart ? flexRowStyles.hAlignStart : "",
        marginSpacer ? flexRowStyles.marginSpacer : "",
        spaceBetween ? flexRowStyles.spaceBetween : "",
        vAlignCenter ? flexRowStyles.vAlignCenter : "",
        vAlignEnd ? flexRowStyles.vAlignEnd : "",
        vAlignStart ? flexRowStyles.vAlignStart : "",
        wrap ? flexRowStyles.wrap : ""
    );
    return (
        <div className={mergedClasses} style={style}>
            {children}
        </div>
    );
};

FlexRow.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    fill: "both" | "height" | "width" | "view",
    gap: "smaller" | "small" | "medium" | "large",
    hAlign: "start" | "center" | "end",
    inline: PropTypes.bool,
    name: PropTypes.string,
    role: PropTypes.string,
    spaceBetween: PropTypes.bool,
    style: PropTypes.object,
    transparent: PropTypes.bool,
    vAlign: "start" | "center" | "end",
};

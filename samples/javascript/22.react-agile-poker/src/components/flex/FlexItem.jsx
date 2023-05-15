import PropTypes from "prop-types";
import { mergeClasses } from "@fluentui/react-components";
import { getFlexItemStyles } from "./flex-styles";
import { forwardRef } from "react";

export const FlexItem = forwardRef((props, ref) => {
    const { className, children, grow, noShrink, style } = props;
    const flexItemStyles = getFlexItemStyles();
    const mergedClasses = mergeClasses(
        grow ? flexItemStyles.grow : "",
        noShrink ? flexItemStyles.noShrink : "",
        className ?? ""
    );

    return (
        <div className={mergedClasses} style={style} ref={ref}>
            {children}
        </div>
    );
});
FlexItem.displayName = "FlexItem";

FlexItem.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    grow: PropTypes.bool,
    noShrink: PropTypes.bool,
    style: PropTypes.object,
};

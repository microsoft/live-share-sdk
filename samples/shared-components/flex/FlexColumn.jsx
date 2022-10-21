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
        fill ? flexColumnStyles.fill : "",
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

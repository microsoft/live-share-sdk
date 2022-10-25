import { mergeClasses } from "@fluentui/react-components";
import { CSSProperties, FC, ReactNode } from "react";
import { getFlexColumnStyles } from "./FlexStyles";

export const FlexColumn: FC<{
  children: ReactNode,
  fill?: boolean,
  hAlignCenter?: boolean,
  hAlignEnd?: boolean,
  hAlignStart?: boolean,
  marginSpacer?: boolean,
  scroll?: boolean,
  spaceBetween?: boolean,
  style?: CSSProperties,
  vAlignCenter?: boolean,
  vAlignEnd?: boolean,
  vAlignStart?: boolean,
}> = (props) => {
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

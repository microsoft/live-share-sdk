import { mergeClasses } from "@fluentui/react-components";
import { CSSProperties, FC, ReactNode } from "react";
import { getFlexRowStyles } from "./FlexStyles";

export const FlexRow: FC<{
  children: ReactNode,
  fill?: boolean,
  hAlignCenter?: boolean,
  hAlignEnd?: boolean,
  hAlignStart?: boolean,
  marginSpacer?: boolean,
  spaceBetween?: boolean,
  style?: CSSProperties,
  vAlignCenter?: boolean,
  vAlignEnd?: boolean,
  vAlignStart?: boolean,
  wrap?: boolean,
}> = (props) => {
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

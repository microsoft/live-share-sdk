import { mergeClasses } from "@fluentui/react-components";
import { getFlexItemStyles } from "./FlexStyles";

export const FlexItem = (props) => {
  const { children, grow, noShrink, style } = props;
  const flexItemStyles = getFlexItemStyles();
  const mergedClasses = mergeClasses(
    grow ? flexItemStyles.grow : "",
    noShrink ? flexItemStyles.noShrink : ""
  );

  return (
    <div className={mergedClasses} style={style}>
      {children}
    </div>
  );
};

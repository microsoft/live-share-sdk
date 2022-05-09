import { Text, mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layouts";

export const PageError = ({ error }) => {
  const flexColumnStyles = getFlexColumnStyles();
  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.fill,
        flexColumnStyles.vAlignCenter,
        flexColumnStyles.hAlignCenter
      )}
    >
      <Text align="center">{`${error}`}</Text>
    </div>
  );
};

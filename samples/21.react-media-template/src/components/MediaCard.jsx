/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  Card,
  CardPreview,
  CardFooter,
} from "@fluentui/react-components/unstable";
import { Image, Text, Button, mergeClasses } from "@fluentui/react-components";
import { Delete20Regular } from "@fluentui/react-icons";
import { getFlexRowStyles, getFlexItemStyles } from "../styles/layouts";

export const MediaCard = ({
  mediaItem,
  nowPlayingId,
  sharingActive,
  buttonText,
  selectMedia,
  removeMediaItem,
}) => {
  const flexRowStyle = getFlexRowStyles();
  const flexItemStyles = getFlexItemStyles();
  return (
    <div className={flexItemStyles.noShrink}>
      <Card
        appearance="filled"
        style={{
          padding: "0rem",
          minHeight: "0px",
          minWidth: "0px",
          width: "100%",
          height: "100%",
          margin: "0rem",
          cursor: "default",
          border: "none",
        }}
      >
        <CardPreview
          style={{
            minHeight: "0px",
            maxHeight: "140px",
            overflow: "hidden",
            marginBottom: "0.8rem",
          }}
        >
          <Image
            height={140}
            fit="contain"
            src={mediaItem.thumbnailImage}
            style={{ minHeight: "0px" }}
          />
        </CardPreview>
        <div style={{ minHeight: "0px" }}>
          <Text size={400} weight="semibold">
            {mediaItem.title}
          </Text>
        </div>
        <CardFooter
          styles={{ padding: "0px 12px", minHeight: "0px", minWidth: "0px" }}
        >
          <div className={mergeClasses(flexRowStyle.root, flexRowStyle.vAlignCenter)} style={{width: "100%"}}>
            <div className={flexItemStyles.grow}>
              <Button
                appearance="outline"
                size="small"
                disabled={nowPlayingId === mediaItem.id && sharingActive}
                onClick={() => {
                  selectMedia(mediaItem);
                }}
              >
                {buttonText}
              </Button>
            </div>
            {!!removeMediaItem && (
              <Button
                appearance="subtle"
                size="small"
                icon={<Delete20Regular />}
                title={"Remove from playlist"}
                onClick={() => {
                  removeMediaItem(mediaItem.id);
                }}
              />
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

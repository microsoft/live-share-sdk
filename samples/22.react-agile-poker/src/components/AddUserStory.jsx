/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useState } from "react";

// UI imports:
import { mergeClasses, Button } from "@fluentui/react-components";
import { Label } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layout";

export const AddUserStory = ({ addUserStory }) => {
    const [value, setValue] = useState("");
    const flexColumnStyles = getFlexColumnStyles();

    const onChange = (event) => {
        setValue(event.target.value);
    };

    return (
        <div
            className={mergeClasses(
                flexColumnStyles.root,
                flexColumnStyles.smallGap,
                flexColumnStyles.hAlignStart,
                flexColumnStyles.vAlignStart
            )}
            style={{ marginBottom: "1.5rem", padding: "0.25rem" }}
        >
            <Label htmlFor={"textarea611"} style={{ display: "block" }}>
                Add a new user story:
            </Label>
            <textarea
                value={value}
                onChange={onChange}
                id={"textarea611"}
                style={{ width: "100%" }}
            />
            <Button
                appearance="primary"
                onClick={() => {
                    addUserStory(value);
                    setValue("");
                }}
            >
                Add user story
            </Button>
        </div>
    );
};

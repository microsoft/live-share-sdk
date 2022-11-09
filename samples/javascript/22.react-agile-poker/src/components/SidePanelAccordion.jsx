/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Title1,
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
} from "@fluentui/react-components";
import { Add24Filled } from "@fluentui/react-icons";

export const SidePanelAccordion = (props) => {
    return (
        <Accordion expandIconPosition="end" collapsible>
            <AccordionItem value="1">
                <AccordionHeader
                    expandIcon={<Add24Filled />}
                    expandIconPosition="end"
                    style={{ backgroundColor: "transparent" }}
                >
                    <Title1>User Stories</Title1>
                </AccordionHeader>
                <AccordionPanel>{props.children}</AccordionPanel>
            </AccordionItem>
        </Accordion>
    );
};

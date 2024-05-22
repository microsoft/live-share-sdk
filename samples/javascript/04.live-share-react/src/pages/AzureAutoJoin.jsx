import { InsecureTokenProvider } from "@fluidframework/test-runtime-utils";
import { AzureProvider } from "@microsoft/live-share-react";
import { SharedMap } from "fluid-framework/legacy";
import {
    ExampleSharedMap,
    ExampleSharedState,
    EXAMPLE_SHARED_MAP_KEY,
    ExampleLiveCanvas,
} from "../components";
import { v4 as uuid } from "uuid";

// Replace this with your connection options from the Azure Fluid Relay portal
const azureClientOptions = {
    connection: {
        type: "local",
        tokenProvider: new InsecureTokenProvider("", {
            id: uuid(),
            name: "Test User",
        }),
        endpoint: "http://localhost:7070",
    },
};

export const AzureAutoJoin = () => {
    return (
        <AzureProvider
            clientOptions={azureClientOptions}
            createOnLoad
            joinOnLoad
            containerId={window.location.hash.substring(1)}
            initialObjects={{
                /**
                 * Optionally can defined custom objects and use them within their corresponding hook. See ExampleSharedMap to see
                 * how this works.
                 */
                [EXAMPLE_SHARED_MAP_KEY]: SharedMap,
            }}
        >
            <ExampleSharedState />
            <ExampleSharedMap />
            <ExampleLiveCanvas />
        </AzureProvider>
    );
};

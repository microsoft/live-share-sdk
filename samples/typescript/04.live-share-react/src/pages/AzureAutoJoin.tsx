import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { AzureProvider } from "@microsoft/live-share-react";
import { SharedMap } from "fluid-framework";
import {
    ExampleSharedMap,
    ExampleSharedState,
    EXAMPLE_SHARED_MAP_KEY,
} from "../components";
import { AzureClientProps } from "@fluidframework/azure-client";

// Replace this with your connection options from the Azure Fluid Relay portal
const azureClientOptions: AzureClientProps = {
    connection: {
        type: "local",
        tokenProvider: new InsecureTokenProvider("", {
            id: "123",
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
        </AzureProvider>
    );
};

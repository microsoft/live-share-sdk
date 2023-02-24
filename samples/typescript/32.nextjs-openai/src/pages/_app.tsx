// @ts-nocheck
import {
    createDOMRenderer,
    FluentProvider,
    GriffelRenderer,
    SSRProvider,
    RendererProvider,
    webDarkTheme,
} from "@fluentui/react-components";
import type { AppProps } from "next/app";

type EnhancedAppProps = AppProps & { renderer?: GriffelRenderer };

function MyApp({ Component, pageProps, renderer }: EnhancedAppProps) {
    return (
        // 👇 Accepts a renderer from <Document /> or creates a default one
        //    Also triggers rehydration a client
        <RendererProvider renderer={renderer || createDOMRenderer()}>
            <SSRProvider>
                <FluentProvider
                    theme={webDarkTheme}
                    style={{ minHeight: "100vh", margin: "0" }}
                >
                    <Component {...pageProps} />
                </FluentProvider>
            </SSRProvider>
        </RendererProvider>
    );
}

export default MyApp;

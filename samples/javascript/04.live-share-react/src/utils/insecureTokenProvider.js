import { ITokenProvider } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-runtime-utils/internal";
import { v4 as uuid } from "uuid";

export function getInsecureTokenProvider() {
    const userId = () => {
        try {
            const userIdParam = new URL(
                window.location.href
            )?.searchParams?.get("userId");
            return userIdParam;
        } catch {
            // window not available
            return undefined;
        }
    };
    const tokenProvider = new InsecureTokenProvider("", {
        id: userId() ?? uuid(),
        name: "Test User",
    });
    return tokenProvider;
}

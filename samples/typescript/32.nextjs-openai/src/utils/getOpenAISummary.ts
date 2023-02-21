import { OpenAICompletionOptions, OpenAIModelType } from "@/types";

/**
 * 
 * Util to get OpenAI summary from /pages/api/openai/summary.ts
 * 
 * @param prompt text to summarize / get response for
 * @param model OpenAI model to use
 * @returns OpenAI response text
 */
export const getOpenAISummary = async (
    prompt: string,
    model: OpenAIModelType = OpenAIModelType.davinci003,
    options?: OpenAICompletionOptions,
): Promise<string> => {
    try {
        const response = await fetch("/api/openai/summary", {
            method: "POST",
            body: JSON.stringify({
                prompt,
                model,
                ...options,
            }),
            headers: new Headers({
                "Content-Type": "application/json",
                Accept: "application/json",
            }),
        });
        const { responseText, error } = await response.json();
        if (error && typeof error === "string") {
            throw new Error(error);
        }
        if (typeof responseText !== "string") {
            throw new Error("Invalid response");
        }
        return responseText;
    } catch (error: any) {
        throw error;
    }
};

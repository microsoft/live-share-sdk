import { OpenAICompletionOptions, OpenAIModelType } from "@/types";
import { getOpenAISummary } from "@/utils";
import { useCallback } from "react";

export const useGetCompletion = (model: OpenAIModelType = OpenAIModelType.davinci003, options?: OpenAICompletionOptions) => {
    return useCallback(async (promptValue: string): Promise<string> => {
        try {
            const responseText = await getOpenAISummary(
                promptValue,
                model,
                options
            );
            return responseText;
        } catch (error: any) {
            throw error;
        }
    }, [model, options]);
};
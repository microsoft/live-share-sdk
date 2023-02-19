// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
    Configuration,
    CreateCompletionRequest,
    CreateCompletionResponse,
    OpenAIApi,
} from "openai";

type Data = {
    responseText?: string;
    error?: {
        message: string;
    };
};

export const getOpenAICompletionResponse = async (
    request: CreateCompletionRequest
): Promise<CreateCompletionResponse> => {
    const configuration = new Configuration({
        apiKey: process.env.OPEN_AI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createCompletion(request);
    return response.data;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    const {
        prompt,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        stop,
    } = req.body;
    const model = ["text-davinci-003", "text-curie-001"].includes(
        req.body.model
    )
        ? req.body.model
        : "text-davinci-003";
    const defaultValues = {
        temperature: "text-davinchi-003" ? 0.6 : 0,
        max_tokens: model === "text-davinchi-003" ? 2500 : 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: ["###"],
    };
    try {
        if (typeof prompt !== "string") {
            throw new Error(
                "Prompt must be a string" + JSON.stringify(req.body)
            );
        }
        const response = await getOpenAICompletionResponse({
            prompt,
            model,
            temperature:
                typeof temperature === "number"
                    ? temperature
                    : defaultValues.temperature,
            max_tokens: defaultValues.max_tokens,
            top_p:
                typeof top_p === "number" && top_p >= 0 && top_p <= 1
                    ? top_p
                    : defaultValues.top_p,
            frequency_penalty:
                typeof frequency_penalty === "number" &&
                frequency_penalty >= 0 &&
                frequency_penalty <= 1
                    ? frequency_penalty
                    : defaultValues.frequency_penalty,
            presence_penalty:
                typeof presence_penalty === "number" &&
                presence_penalty >= 0 &&
                presence_penalty <= 1
                    ? presence_penalty
                    : defaultValues.presence_penalty,
            stop:
                Array.isArray(stop) &&
                stop.every((val) => typeof val === "string")
                    ? stop
                    : defaultValues.stop,
        });
        res.status(200).json({
            responseText: response.choices
                .map((choice) => choice.text)
                .join("\n"),
        });
    } catch (error: any) {
        res.status(400).json({
            error: error.message || "Something went wrong",
        });
    }
}

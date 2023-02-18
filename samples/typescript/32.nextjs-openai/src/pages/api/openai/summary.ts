// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, CreateCompletionResponse, OpenAIApi } from "openai";

type Data = {
    responseText?: string;
    error?: {
        message: string;
    };
};

export const getOpenAICompletionResponse = async (
    prompt: string
): Promise<CreateCompletionResponse> => {
    const configuration = new Configuration({
        apiKey: process.env.OPEN_AI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.6,
        max_tokens: 2500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });
    return response.data;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    const prompt = req.body.prompt;
    try {
        if (typeof prompt !== "string") {
            throw new Error("Prompt must be a string" + JSON.stringify(req.body));
        }
        const response = await getOpenAICompletionResponse(prompt);
        res.status(200).json({
            responseText: response.choices.map((choice) => choice.text).join("\n"),
        });
    } catch (error: any) {
        res.status(400).json({
            error: error.message || "Something went wrong",
        });
    }
}

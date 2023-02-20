export enum OpenAIModelType {
    davinci003 = "text-davinci-003",
    curie001 = "text-curie-001",
}
export interface OpenAICompletionOptions {
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
}

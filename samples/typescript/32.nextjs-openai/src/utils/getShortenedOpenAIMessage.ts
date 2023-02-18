import { OpenAICharacterBudget } from "@/constants/TokenBudget"

export const getShortenedOpenAIMessage = (prefix: string, message: string): string => {
    const characterCap = OpenAICharacterBudget - prefix.length;
    return `${prefix}${message.substring(Math.max(message.length - characterCap, 0))}`;
}
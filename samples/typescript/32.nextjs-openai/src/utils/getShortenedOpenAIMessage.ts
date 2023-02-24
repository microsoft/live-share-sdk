import { OpenAICharacterBudget } from "@/constants/TokenBudget";

// This function takes in a message prefix and a full message, and returns a shortened version of the message that will fit within the OpenAI character budget.
// The shortened message is created by starting at the end of the full message and cutting off characters until the message fits within the OpenAI character budget.
// The message prefix is then added to the beginning of the shortened message.
// The function takes in the message prefix as a string, and the full message as a string.
// The function returns the shortened message as a string.
export const getShortenedOpenAIMessage = (
    prefix: string,
    message: string
): string => {
    const characterCap = OpenAICharacterBudget - prefix.length;
    const messageLength = message.length;
    const messageStartIndex = Math.max(messageLength - characterCap, 0);
    const shortenedMessage = message.substring(messageStartIndex);
    return `${prefix}${shortenedMessage}`;
};

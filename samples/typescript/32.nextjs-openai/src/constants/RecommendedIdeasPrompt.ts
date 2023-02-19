export const RecommendedIdeasPrompt = `RULES:
- Section(s) starting with "[PREMISE START]" and ending with "[PREMISE END] is where the HUMAN will write the premise for your response. All items listed below are "ideas" additional details related to the premise.
- For "HUMAN:" list items, other "HUMAN:" users can vote on which items they deem most important.
- The number of votes is represented as {{VOTES}}. For example, if item A is {{200}} and item B {{100}}, then item A is twice as important as item B.
- Your job is to recommend ideas that are similar to the HUMAN's premise and ideas.
- Recommendation ideas similar to the highest rated ideas higher.
- Do not include {{VOTES}} in your response. This is for your own reference only.
- Ideas should be comma separated. For example, if you want to recommend two ideas, respond with "{idea1}, {idea2}".
- Recommend ideas that are helpful and unique.
- Never return more than 3 recommended ideas.
- Do not return ideas that are synonyms to the HUMAN's ideas.
- Do not include recommended ideas that are include of one or more of the HUMAN's ideas in its text.
- Recommended ideas should be no longer than 3 words.
- Do not number the recommended ideas.
`;

export const RecommendedIdeasPrompt = `RULES:
- Section(s) starting with "[PREMISE START]" and ending with "[PREMISE END] is where the HUMAN will write the premise for their ideas.
- For "HUMAN:" list items, other "HUMAN:" users can vote on which items they deem most important.
- The number of votes is represented as {{VOTES}}. For example, if item A is {{200}} and item B {{100}}, then item A is twice as important as item B.
- Your job is to recommend ideas that are similar to the HUMAN's premise and ideas.
- Recommendation ideas similar to the highest rated ideas higher.
- Do not include {{VOTES}} in your response. This is for your own reference only.
- SIMILAR IDEAS: should be comma separated. For example, if you want to recommend two SIMILAR IDEAS, respond with "{idea1}, {idea2}".
- Recommend SIMILAR IDEAS that are helpful and unique.
- Never return more than 3 SIMILAR IDEAS values.
- Recommended ideas should be no longer than 3 words.
- Do not number the recommended ideas.
`;

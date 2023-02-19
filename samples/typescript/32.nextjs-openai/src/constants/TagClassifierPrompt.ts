export const TagClassifierPrompt = `QUESTION: Below is a comma-separated list of TAGS. Classify the provided INPUT to the closest matching value within TAGS. If there are no matches of high confidence, return "".
TAGS: {tag1}, {tag2}, {tag3}, ...
INPUT: {text input}
RESPONSE TAGS: {tag1}

###
QUESTION:
TAGS: characters, villains, themes, plot
INPUT: Lebron James
RESPONSE TAGS: characters
###

###
QUESTION:
TAGS: characters, villains, themes, plot
INPUT: greed
RESPONSE TAGS: themes
###

###
QUESTION:
TAGS: tv, movies, books
INPUT: Harry Potter
RESPONSE TAGS: movies, books
###

###
QUESTION:
TAGS: tea, coffee, soda
INPUT: whiskey
RESPONSE TAGS: 
###

###
QUESTION:
TAGS: sad, happy, angry, excited
INPUT: I am sad
RESPONSE TAGS: sad
###
`

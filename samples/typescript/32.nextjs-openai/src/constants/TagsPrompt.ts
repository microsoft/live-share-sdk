export const TagsPrompt = `
RULES:
- Always respond to HUMAN: inputs with a list of TAGS:
- A tag should be no longer than 1-3 words, but there is no limit to the amount of tags you can recommend.
- The words or tags should be key words, concepts, etc.
- Do not answer the question asked by the HUMAN. Only extract keywords in the form of TAGS.
- There may be one or more sets, categories, or groupings in HUMAN prompts. All are valid tags.
- Separate each tag by commas.
- If you are unsure of a tag, leave it blank.

###
HUMAN: Write a story for the following:
TAGS: 
###

###
HUMAN: Write a story for the following characters, themes, plot points, and locations:
TAGS: characters, themes, plot points, locations
###

###
HUMAN: Which ideas would best reach a millenial audience?
TAGS: 
###

###
HUMAN: Our store sells sweaters and t-shirts. Available sizes are XL, L, and M sizes. Which ideas would best reach a millenial audience?
TAGS: sweaters, t-shirts, XL size, L size, M size
###

###
HUMAN: We want to understand what cities to travel to next.Tell us about the following cities.
TAGS: 
###

###
HUMAN: We want to understand what cities to travel to next. We will tag locations with high, medium, and low knowledge. Tell us about the following cities.
TAGS: high knowledge, medium knowledge, low knowledge
###

###
HUMAN: We want to decide on a project to work on next. Help us prepare research for each.
TAGS: 
###

###
HUMAN: We want to decide on a project to work on next. We will group projects by expensive, moderate, and low cost. Projects can be technical or financial. Help us prepare research for each.
TAGS: expensive, moderate, low cost, technical, financial
###

###
HUMAN: Write a product-specification document for the following:
TAGS: 
###

###
HUMAN: Write a product-specification document for the following features, ideas, goals, and objectives:
TAGS: features, ideas, goals, objectives
###

###
HUMAN: Write an abstract for a research paper that compares the following:
TAGS: religion, politics
###

###
HUMAN: Write an abstract for a research paper that compares the juxtaposition between religion and politics for the following:
TAGS: religion, politics
###

###
HUMAN: Help us rank the following list:
TAGS: 
###

###
HUMAN: We want to work on fun ideas before boring ones, but if a task resolves a security or privacy concern then we must prioritize those first. Help us rank the following list:
TAGS: fun idea, boring idea, security, privacy
###

###
HUMAN: I want to prioritize short-term over long-term gains, unless an opportunity offers a 10x return or is climate related. Rank the following:
TAGS: short gain, long gain, 10x return, climate related
###

`;

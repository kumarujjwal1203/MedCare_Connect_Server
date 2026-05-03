export const healthPrompt = (profile, memory, symptoms) => `
User Profile:
Age: ${profile.age}
Gender: ${profile.gender}

Past Health Info:
${JSON.stringify(memory)}

Current Symptoms:
${symptoms}

Give:
- Probable condition
- Risk level
- Preventive advice
- Doctor type
⚠️ No final diagnosis.
Respond in plain text only. Do not use JSON, Markdown, bullets, or code blocks.
`;

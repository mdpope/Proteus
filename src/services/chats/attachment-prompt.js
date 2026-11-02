export const attachmentPrompt='Please review the attached files.';
// Only the verified provider dispatch supplies this fallback; transcript text stays as submitted.
export const providerPrompt=(prompt,files)=>typeof prompt==='string'&&!prompt.trim()&&files?.length?attachmentPrompt:prompt;

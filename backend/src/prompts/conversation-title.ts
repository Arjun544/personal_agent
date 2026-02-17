export const CONVERSATION_TITLE_PROMPT = `Generate a short, concise conversation title (max 5 words) based on the user message.
Respond with ONLY the title text without any quotation marks or additional formatting.

Examples:
- User asks about weather → Weather Forecast Inquiry
- User asks who they are → Identity and Profession Inquiry
- User discusses project planning → Project Planning Discussion
- User asks for recipe → Recipe Request Help

User Message: {message}`;

// Character Chat System Helpers
// Token estimation and context window management for chat system
// EM DASH SPACING FIX: Added punctuation style instruction for British/Oxford em dash formatting

import type { ChatMessage } from '@/types/chat';

/**
 * Estimate token count for a message
 * Rough estimate: 1 token per 4 characters
 */
export function estimateMessageTokens(message: ChatMessage): number {
  return Math.ceil(message.content.length / 4);
}

/**
 * Get relevant conversation context using token-budget sliding window
 * Prioritizes recent messages while respecting token limits
 * Always includes minimum last 3 messages
 * 
 * @param messages - All messages in conversation
 * @param maxTokens - Maximum tokens for context (default 4000)
 * @returns Filtered messages for context
 */
export function getRelevantContext(
  messages: ChatMessage[],
  maxTokens: number = 4000
): ChatMessage[] {
  const minMessages = 3;
  const relevantMessages: ChatMessage[] = [];
  let tokenCount = 0;
  
  // Work backwards from most recent
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateMessageTokens(msg);
    
    // Always include last minMessages, even if over budget
    if (messages.length - i <= minMessages) {
      relevantMessages.unshift(msg);
      tokenCount += msgTokens;
      continue;
    }
    
    // Check if adding this message exceeds budget
    if (tokenCount + msgTokens > maxTokens) {
      break;
    }
    
    relevantMessages.unshift(msg);
    tokenCount += msgTokens;
  }
  
  return relevantMessages;
}

/**
 * Generate system prompt for character conversation
 * 
 * NOTE: 'stance' parameter now receives persona's hardcoded baseStubbornness
 * from personas.ts, not user input. This ensures authentic character behavior.
 */
export function generateChatSystemPrompt(
  personaId: string,
  stance: number,  // Receives persona's baseStubbornness from API
  extensiveness: number,
  recentMessages: ChatMessage[],
  personaName: string,
  personaIdentity: string,
  personaTurnRules: string
): string {
  const contextText = recentMessages.length > 0
    ? recentMessages.map(m => `${m.role === 'user' ? 'User' : personaName}: ${m.content}`).join('\n')
    : 'This is the start of the conversation.';
  
  // Fix 3: Strong extensiveness guidance based on level
  let extensivenessGuidance = '';
  const roundedExtensiveness = Math.round(extensiveness);
  
  if (roundedExtensiveness === 1) {
    extensivenessGuidance = `
CRITICAL: Response Detail Level is 1/5 (VERY BRIEF).
- Keep responses to 1-2 sentences MAXIMUM (~50 words)
- Be concise and direct - answer the question, then stop
- Do NOT elaborate, expand, or provide examples
- Do NOT write multiple paragraphs
- If you exceed 2 sentences, you are being too verbose
- Think: "What is the shortest way to answer this?"`;
  } else if (roundedExtensiveness === 2) {
    extensivenessGuidance = `
Response Detail Level: 2/5 (Brief).
- Keep responses to 2-3 sentences (~100 words)
- Be concise but complete
- Provide direct answers without excessive elaboration
- Avoid unnecessary details or examples`;
  } else if (roundedExtensiveness === 3) {
    extensivenessGuidance = `
Response Detail Level: 3/5 (Balanced).
- Provide balanced responses (3-4 sentences)
- Be thorough but not excessive
- Include relevant context when helpful
- Maintain natural conversation flow`;
  } else if (roundedExtensiveness === 4) {
    extensivenessGuidance = `
Response Detail Level: 4/5 (Detailed).
- Provide detailed responses (4-5 sentences)
- Elaborate on your points with examples or context
- Be comprehensive in your explanations
- Include relevant details and nuance`;
  } else {
    extensivenessGuidance = `
Response Detail Level: 5/5 (Comprehensive).
- Provide comprehensive, detailed responses
- Elaborate fully on your thoughts and ideas
- Include examples, context, and nuanced explanations
- Be thorough and expansive in your responses`;
  }
  
  return `
You are ${personaName}. You're having a friendly, one-on-one conversation with a user who wants to talk with you.

${personaIdentity}

${personaTurnRules}

IMPORTANT: This is a CONVERSATION, not a debate. You are NOT arguing against an opponent. You are chatting naturally with someone interested in your perspective.

${extensivenessGuidance}

CONVERSATION GUIDELINES:
- Opinion Strength: ${stance}/10 (how firmly you hold your views - ${stance <= 3 ? 'more flexible/open' : stance <= 7 ? 'moderately firm' : 'very firm/convicted'})
- Stay completely in character at all times
- Reference previous messages naturally when relevant
- Engage thoughtfully with the user's questions and ideas
- Be authentic to your character but friendly and conversational, not adversarial

AVOID:
- Debate terminology ("my opponent", "the proposition", "I argue that", "let's debate")
- Adversarial framing
- Expecting a formal argument structure
- Treating the user as someone to defeat or convince

DO:
- Respond naturally and conversationally
- Answer questions thoughtfully
- Share your views without needing an opponent or position to defend
- Be engaging and authentic to your character's voice

RECENT CONVERSATION CONTEXT:
${contextText}

PUNCTUATION STYLE: Use British/Oxford style with spaces around em dashes for better readability.
Example: "word — word" (not "word—word")
Always include spaces before and after em dashes.

Respond as ${personaName} would in a natural, friendly conversation. Be authentic to your character but conversational, not adversarial.
`;
}


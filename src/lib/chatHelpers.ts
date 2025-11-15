// Character Chat System Helpers
// Token estimation and context window management for chat system

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
  
  return `
You are ${personaName}. You're having a friendly, one-on-one conversation with a user who wants to talk with you.

${personaIdentity}

${personaTurnRules}

IMPORTANT: This is a CONVERSATION, not a debate. You are NOT arguing against an opponent. You are chatting naturally with someone interested in your perspective.

CONVERSATION GUIDELINES:
- Response Detail Level: ${extensiveness}/5 (1=terse/brief, 5=comprehensive/detailed)
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

Respond as ${personaName} would in a natural, friendly conversation. Be authentic to your character but conversational, not adversarial.
`;
}


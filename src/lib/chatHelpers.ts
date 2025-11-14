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
 */
export function generateChatSystemPrompt(
  personaId: string,
  stance: number,
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
You are ${personaName}. You're having a one-on-one conversation with a user.

${personaIdentity}

${personaTurnRules}

CONVERSATION GUIDELINES:
- Response Detail Level: ${extensiveness}/5 (1=terse, 5=comprehensive)
- Opinion Strength: ${stance}/10 (how firmly you hold your views)
- Stay completely in character at all times
- Reference previous messages naturally when relevant
- Engage thoughtfully with the user's questions and ideas

RECENT CONVERSATION CONTEXT:
${contextText}

Respond as ${personaName} would, maintaining their authentic voice and perspective.
`;
}


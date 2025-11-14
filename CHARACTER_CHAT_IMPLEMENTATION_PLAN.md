# Character Chat System - Complete Implementation Plan (Revised)

**Date:** Planning Complete  
**Status:** ✅ Approved - Ready for Phase 1 Implementation

---

## EXECUTIVE SUMMARY

Design and implement a completely isolated "Character Chat" feature that enables one-on-one conversations with Matrix Arena personas. This system is architecturally separate from the debate platform with zero code sharing, using copied/adapted components and shared resources only (personas, models, styling).

### Key Differentiators from Debate System
- **Single Model**: One model + one persona per session
- **No Opposition**: Collaborative conversation, not adversarial
- **Dynamic Control**: User adjusts response length per message
- **Flexible Turns**: No turn limits, ongoing conversation
- **Separate State**: Zero shared state with debate system
- **Ephemeral Sessions**: Each new chat starts fresh, no cross-session memory

---

## CRITICAL REFINEMENTS (MUST IMPLEMENT)

### 1. Navigation Structure

**Requirement:** Add chat icon to MAIN navigation header (same level as Library button).

**All pages should have:**
```
[Matrix Arena Logo] ... [💬 Chat] [📚 Library]
```

**Implementation Location:**
- Update `src/app/page.tsx` header (around line 362)
- Update `src/app/chat/page.tsx` header (new file)
- Update `src/app/chat/[sessionId]/page.tsx` header (new file)
- Update `src/app/library/page.tsx` header (existing file)

**Code Pattern:**
```tsx
<Link href="/chat" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Character Chat">
  <span role="img" aria-label="Chat">💬</span>
</Link>
```

Users can navigate between Debate → Chat → Library from anywhere.

---

### 2. Error Handling (MUST HAVE)

**Error State Structure:**
```typescript
// In src/types/chat.ts
export interface ChatError {
  type: 'api' | 'auth' | 'rate_limit' | 'network' | 'cost';
  message: string;
  retryable: boolean;
  timestamp: Date;
}

// In useChatSession.ts
error: ChatError | null;
```

**Error Types:**
- `api`: Model API failures, timeouts, invalid responses
- `auth`: Access code invalid, session expired
- `rate_limit`: Rate limit exceeded (retryable with backoff)
- `network`: Network failures, connection issues (retryable)
- `cost`: Insufficient credits/queries (not retryable)

**UI Requirements:**
- Display error messages clearly in chat UI
- Add "Retry" button for retryable errors
- Show error type badge (color-coded)
- Handle: model timeouts, rate limits, insufficient credits, network failures
- Error persists until user dismisses or retries

**Error Display Component:**
```tsx
// src/components/chat/ChatError.tsx (NEW)
// Shows error banner with retry button
```

---

### 3. Context Window Strategy

**Revised Approach:** Token-budget sliding window (not fixed 10 messages)

```typescript
// In src/lib/chatHelpers.ts (NEW)
function estimateMessageTokens(message: ChatMessage): number {
  // Rough estimate: 1 token per 4 characters
  return Math.ceil(message.content.length / 4);
}

function getRelevantContext(
  messages: ChatMessage[],
  maxTokens: number = 4000
): ChatMessage[] {
  // Always include minimum last 3 messages
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
```

**Benefits:**
- Prevents token waste while maintaining better context
- Prioritizes recent messages
- Always includes minimum context (last 3 messages)
- Adapts to message length automatically

---

### 4. Session Isolation

**CRITICAL:** Chat sessions are ephemeral within a single session.

**Rules:**
- ✅ No conversation memory across different sessions
- ✅ Each new chat starts with zero context
- ✅ Only saved sessions can be resumed (via Library)
- ✅ No cross-session context bleed
- ✅ Session state cleared on page refresh (unless saved)

**Implementation:**
- Use `sessionStorage` for active session (clears on tab close)
- Use `localStorage` for saved sessions (persists)
- Each session has unique `sessionId` (UUID)
- No global chat state or memory

---

### 5. Library Integration

**Confirmed Approach:** Separate tabs

**Library Page Structure:**
```
Library Page:
  [Debates Tab] [Chat Sessions Tab]
```

**Chat Sessions Tab Shows:**
- List of saved chat sessions
- Persona name, model, message count, timestamp
- Preview of first message
- Click to resume session → navigates to `/chat/[sessionId]`

**Implementation:**
- Update `src/app/library/page.tsx`
- Add tab state: `activeView: 'debates' | 'chats'`
- Filter `MarkedItem[]` for debates
- Load chat sessions from Supabase/localStorage for chats

---

### 6. Configuration Modal

**Requirement:** Include ALL settings upfront in modal

**Modal Flow:**
1. User clicks persona on `/chat` landing page
2. Modal opens with:
   - Model selector (single dropdown)
   - Persona display (already selected, shows avatar)
   - Stance slider (0-10) - "Opinion Strength"
   - Extensiveness slider (1-5) - "Response Detail"
   - "Start Chat" button
3. User configures → clicks "Start Chat"
4. Creates session → navigates to `/chat/[sessionId]`

**Modal Component:**
```tsx
// src/components/chat/ChatConfigurationModal.tsx (NEW)
// Includes all configuration options before starting chat
```

**Note:** User can still adjust settings mid-chat via collapsible config panel, but initial setup is comprehensive.

---

## ARCHITECTURAL BOUNDARIES

### MUST NOT Touch
- `src/hooks/useDebate.ts` - Do not import or modify
- `src/app/page.tsx` - Only add navigation link, no other changes
- `src/app/api/debate/*` - Leave debate APIs untouched
- Any debate-specific components - Copy and adapt, never import

### CAN Reuse (Copy/Adapt Only)
- **Persona Definitions**: `src/lib/personas.ts` → `PERSONAS` object (import allowed)
- **Model Configurations**: `src/lib/orchestrator.ts` → `MODEL_CONFIGS` (import allowed)
- **Model Display Logic**: `src/lib/modelConfigs.ts` → Display helpers (import allowed)
- **Styling System**: Tailwind classes, Matrix theme, colors
- **Component Patterns**: UI structure (copy, don't import debate components)
- **Audio System**: ElevenLabs TTS integration patterns (copy logic)

### Shared Resources (Safe Imports)
```typescript
// These are safe to import directly:
import { PERSONAS } from '@/lib/personas';
import { MODEL_CONFIGS } from '@/lib/orchestrator';
import { getModelDisplayName, getModelColor } from '@/lib/modelConfigs';
import type { AvailableModel, ModelPosition } from '@/types';
```

---

## FILE STRUCTURE

### New Files to Create

```
src/
├── app/
│   └── chat/
│       ├── page.tsx                    # Character selection landing
│       └── [sessionId]/
│           └── page.tsx                # Active chat interface
│
├── components/
│   └── chat/                           # All chat-specific components
│       ├── ChatHeader.tsx              # Model + persona selector header
│       ├── ChatConfiguration.tsx      # Stance + scope controls (collapsible)
│       ├── ChatConfigurationModal.tsx # Initial setup modal
│       ├── ChatMessageList.tsx        # Conversation display
│       ├── ChatMessage.tsx            # Individual message bubble
│       ├── ChatInput.tsx              # Message input with dynamic controls
│       ├── ChatError.tsx              # Error display component
│       ├── ChatModelSelector.tsx      # Single model picker
│       ├── ChatPersonaSelector.tsx    # Persona picker (grid)
│       └── ChatStanceSlider.tsx       # Stance control
│
├── hooks/
│   └── useChatSession.ts              # Complete chat state management
│
├── lib/
│   └── chatHelpers.ts                 # Context window, token estimation
│
├── types/
│   └── chat.ts                        # Chat-specific types
│
└── app/api/
    └── chat/
        ├── message/
        │   └── route.ts               # Character response endpoint
        └── sessions/
            ├── save/route.ts          # Save chat session
            ├── load/route.ts          # Load chat session
            └── list/route.ts          # List user's sessions
```

---

## TYPE DEFINITIONS

### `src/types/chat.ts` (NEW)

```typescript
import type { AvailableModel } from '@/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface ChatConfiguration {
  modelName: AvailableModel;
  personaId: string;
  stance: number;              // 0-10 (how opinionated character is)
  defaultExtensiveness: number; // 1-5 (default response length)
}

export interface ChatSession {
  id: string;
  userId?: string;             // Optional for future auth
  accessCode?: string;         // For tracking
  createdAt: Date;
  updatedAt: Date;
  configuration: ChatConfiguration;
  messages: ChatMessage[];
  metadata?: {
    totalTokens: number;
    totalCost: number;
  };
}

export interface ChatState {
  sessionId: string | null;
  isLoading: boolean;
  configuration: ChatConfiguration;
  messages: ChatMessage[];
  nextMessageExtensiveness: number; // User-controlled for next message
  error: ChatError | null;
}

export interface ChatError {
  type: 'api' | 'auth' | 'rate_limit' | 'network' | 'cost';
  message: string;
  retryable: boolean;
  timestamp: Date;
}
```

---

## CORE HOOK: useChatSession

### `src/hooks/useChatSession.ts` (NEW)

**Responsibilities:**
- Manage chat session state (configuration, messages, loading, error)
- Handle sending messages to API
- Manage dynamic extensiveness (per-message control)
- Session persistence (sessionStorage for active, localStorage for saved)
- Error handling and retry logic
- No debate logic whatsoever

**Key State:**
```typescript
interface ChatSessionState {
  sessionId: string | null;
  isLoading: boolean;
  configuration: ChatConfiguration;
  messages: ChatMessage[];
  nextMessageExtensiveness: number; // User-controlled for next message
  error: ChatError | null;
}
```

**Key Actions:**
```typescript
interface ChatSessionActions {
  initializeSession: (config: ChatConfiguration) => void;
  sendMessage: (content: string, extensiveness?: number) => Promise<void>;
  updateConfiguration: (config: Partial<ChatConfiguration>) => void;
  setNextMessageExtensiveness: (level: number) => void;
  clearError: () => void;
  retryLastMessage: () => Promise<void>;
  clearSession: () => void;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}
```

**Error Handling:**
- Catch API errors and convert to `ChatError`
- Set retryable flag based on error type
- Provide retry mechanism for retryable errors
- Clear error on successful retry or user dismissal

---

## API CONTRACTS

### POST `/api/chat/message`

**Request:**
```typescript
{
  message: string;
  configuration: {
    modelName: AvailableModel;
    personaId: string;
    stance: number;
    extensiveness: number;
  };
  conversationHistory: ChatMessage[]; // Token-budget filtered context
}
```

**Response:**
```typescript
{
  success: true;
  reply: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  remaining: number | 'Unlimited';
}
```

**Error Response:**
```typescript
{
  success: false;
  error: {
    type: 'api' | 'auth' | 'rate_limit' | 'network' | 'cost';
    message: string;
    retryable: boolean;
  };
}
```

**Implementation Notes:**
- Use existing `processDebateTurn` from orchestrator (safe import)
- NO debate orchestration logic
- Single model call, no turn tracking
- Context window: Token-budget sliding window (max 4000 tokens)
- Handle auth via cookies (same as debate system)
- Deduct query quota (same as debate system)

---

### POST `/api/chat/sessions/save`

**Request:**
```typescript
{
  session: ChatSession;
}
```

**Response:**
```typescript
{
  success: true;
  sessionId: string;
}
```

---

### GET `/api/chat/sessions/load?sessionId=xxx`

**Response:**
```typescript
{
  success: true;
  session: ChatSession;
}
```

---

### GET `/api/chat/sessions/list`

**Response:**
```typescript
{
  success: true;
  sessions: Array<{
    id: string;
    createdAt: Date;
    configuration: ChatConfiguration;
    messageCount: number;
    preview: string; // First message preview
  }>;
}
```

---

## SYSTEM PROMPT STRATEGY

### Character Conversation Prompt Template

```typescript
// In src/lib/chatHelpers.ts (NEW)
function generateChatSystemPrompt(
  personaId: string,
  stance: number,
  extensiveness: number,
  recentMessages: ChatMessage[]
): string {
  const persona = PERSONAS[personaId];
  
  return `
You are ${persona.name}. You're having a one-on-one conversation with a user.

${persona.identity}

${persona.turnRules}

CONVERSATION GUIDELINES:
- Response Detail Level: ${extensiveness}/5 (1=terse, 5=comprehensive)
- Opinion Strength: ${stance}/10 (how firmly you hold your views)
- Stay completely in character at all times
- Reference previous messages naturally when relevant
- Engage thoughtfully with the user's questions and ideas
- Use evidence types appropriate to your character

RECENT CONVERSATION CONTEXT:
${recentMessages.map(m => `${m.role === 'user' ? 'User' : persona.name}: ${m.content}`).join('\n')}

Respond as ${persona.name} would, maintaining their authentic voice and perspective.
`;
}
```

**Key Differences from Debate Prompts:**
- No opponent context
- No turn numbers
- No position (pro/con)
- Focus on conversation, not argumentation
- User-controlled extensiveness per message
- Token-budget context window

---

## UI/UX DESIGN

### Route: `/chat` (Landing Page)

**Layout:**
- Matrix-styled header: "CHARACTER STUDIO" (with Chat/Library nav)
- Grid of all 35 persona cards (reuse persona card design)
- Click persona → opens `ChatConfigurationModal`
- Modal includes: Model selector + Stance slider + Extensiveness slider
- After configuration → creates new session → navigates to `/chat/[sessionId]`

**Components:**
- Reuse persona card design from debate system
- New: `ChatConfigurationModal` for model selection and settings

---

### Route: `/chat/[sessionId]` (Active Chat)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: [← Back] Character Studio | Queries: 42 │ ← Sticky header
├─────────────────────────────────────────────────┤
│ Config Panel (Collapsible)                     │
│  - Model Selector (single)                     │
│  - Persona Display (with avatar)               │
│  - Stance Slider (0-10)                        │
│  - Default Extensiveness (1-5)                 │
├─────────────────────────────────────────────────┤
│ Message List (Scrollable)                      │
│  ┌─────────────────────────────────────────┐  │
│  │ User: "What is virtue?"            (Right)│  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ Marcus: "Virtue is..."              (Left)│  │
│  │ [🔊 TTS] [⭐ Mark]                        │  │
│  └─────────────────────────────────────────┘  │
│  [Error Banner if error]                      │
├─────────────────────────────────────────────────┤
│ Input Area (Sticky Bottom)                     │
│  - Text input                                  │
│  - Extensiveness slider (for NEXT message)    │
│  - Send button                                 │
└─────────────────────────────────────────────────┘
```

**Visual Design:**
- User messages: Right-aligned, blue-green glow (`border-blue-500`)
- Character messages: Left-aligned, persona avatar, model badge, green glow
- Response length indicator: Badge showing current extensiveness (1-5)
- Typing indicator during loading
- Error banner: Red/orange, shows error type and retry button

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (3 hours)
**Goal:** Basic chat interface with static responses

**Tasks:**
1. ✅ Create file structure (all new files)
2. ✅ Implement `src/types/chat.ts` (with ChatError type)
3. ✅ Create basic `useChatSession.ts` hook (no API, mock responses, error state)
4. ✅ Build `/chat` landing page (persona grid + navigation header)
5. ✅ Build `ChatConfigurationModal` component
6. ✅ Build `/chat/[sessionId]` page (minimal UI)
7. ✅ Create `ChatMessageList` + `ChatMessage` components
8. ✅ Create `ChatInput` component
9. ✅ Create `ChatError` component (error display)
10. ✅ Implement `getRelevantContext` helper (token-budget context window)
11. ✅ Add navigation header to all pages (Chat + Library links)
12. ✅ Test: Click persona → configure → see chat UI → type message → see mock response

**Success Criteria:**
- Can select persona and navigate to chat
- Configuration modal includes all settings
- Can type message and see it in chat
- Character responds with mock text
- Error component displays properly
- Navigation works between Debate/Chat/Library
- No API calls yet

---

### Phase 2: Intelligence (2-3 hours)
**Goal:** Real AI responses with character personality

**Tasks:**
1. ✅ Implement `/api/chat/message/route.ts`
2. ✅ Create system prompt generation logic (`generateChatSystemPrompt`)
3. ✅ Integrate with existing orchestrator (`processDebateTurn`)
4. ✅ Update `useChatSession.ts` to call API
5. ✅ Implement token-budget context window (use `getRelevantContext`)
6. ✅ Add stance slider logic
7. ✅ Add dynamic extensiveness control
8. ✅ Implement error handling (catch API errors, convert to ChatError)
9. ✅ Add retry logic for retryable errors
10. ✅ Test: Real character responses matching persona personality

**Success Criteria:**
- Character responds with real AI
- Responses match persona voice
- Extensiveness slider affects response length
- Stance slider affects opinion strength
- Context window works (references previous messages)
- Error handling works (displays errors, retry works)
- Query quota decrements correctly

---

### Phase 3: Persistence (2 hours)
**Goal:** Save and resume conversations

**Tasks:**
1. ✅ Create Supabase table schema for `chat_sessions`
2. ✅ Implement `/api/chat/sessions/save/route.ts`
3. ✅ Implement `/api/chat/sessions/load/route.ts`
4. ✅ Implement `/api/chat/sessions/list/route.ts`
5. ✅ Add "Save Session" button to chat UI
6. ✅ Add "Load Session" feature to landing page
7. ✅ Implement sessionStorage autosave (active session)
8. ✅ Update Library page with Chat Sessions tab
9. ✅ Test: Save conversation → close tab → reopen → conversation persists

**Success Criteria:**
- Can save chat sessions
- Can load previous sessions
- Session list shows on landing page
- Library shows Chat Sessions tab
- Auto-save works on page reload
- Sessions are isolated (no cross-session memory)

---

### Phase 4: Polish & Features (2-3 hours)
**Goal:** TTS, animations, export, refinements

**Tasks:**
1. ✅ Add ElevenLabs TTS integration (copy from AudioPlayer logic, NO Supabase caching initially)
2. ✅ Add typing animation during loading
3. ✅ Add message animations (fade in)
4. ✅ Add export conversation (JSON/TXT)
5. ✅ Add configuration panel collapse/expand
6. ✅ Refine styling (Matrix aesthetic consistency)
7. ✅ Add keyboard shortcuts (Enter to send, Shift+Enter for new line)
8. ✅ Add character count/token estimate
9. ✅ (Optional) Edit last user message
10. ✅ (Optional) Regenerate response
11. ✅ Test: All features work smoothly

**Success Criteria:**
- TTS works for character messages
- Animations feel smooth
- Can export conversations
- UI feels polished and consistent with Matrix Arena
- Optional features work if implemented

---

### Phase 5: Integration & Testing (1-2 hours)
**Goal:** Final integration, comprehensive testing

**Tasks:**
1. ✅ Verify navigation works from all pages
2. ✅ Comprehensive testing:
   - All 35 personas work correctly
   - All models work correctly
   - Extensiveness control works per message
   - Stance affects character personality
   - Sessions save/load correctly
   - TTS works for all personas
   - Error handling works for all error types
   - Context window respects token budget
3. ✅ Test auth/access code integration
4. ✅ Test query quota deduction
5. ✅ Verify session isolation (no cross-session memory)
6. ✅ Final polish and bug fixes

**Success Criteria:**
- Can navigate to chat from main page
- Chat sessions appear in Library
- No regressions in debate system
- All features tested and working
- Ready for production

---

## SUPABASE DATABASE SCHEMA

### Table: `chat_sessions`

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,                       -- Optional, for future auth
  access_code VARCHAR(255),           -- For tracking/analytics
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Configuration
  model_name VARCHAR(100) NOT NULL,
  persona_id VARCHAR(100) NOT NULL,
  stance INTEGER CHECK (stance >= 0 AND stance <= 10),
  default_extensiveness INTEGER CHECK (default_extensiveness >= 1 AND default_extensiveness <= 5),
  
  -- Messages (JSONB array)
  messages JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  total_tokens INTEGER DEFAULT 0,
  total_cost NUMERIC(10, 6) DEFAULT 0,
  message_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(messages)) STORED
);

CREATE INDEX idx_chat_sessions_access_code ON chat_sessions(access_code);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_persona_id ON chat_sessions(persona_id);
```

---

## RISK ANALYSIS & MITIGATIONS

### Risk 1: Accidental Code Coupling
**Mitigation:**
- Strict file structure separation (`/chat` directory)
- No imports from debate components
- Code review checklist before merging

### Risk 2: Shared Orchestrator Conflicts
**Mitigation:**
- `processDebateTurn` is pure function, no side effects
- Chat API uses it with chat-specific parameters
- No shared state between systems

### Risk 3: Styling Inconsistencies
**Mitigation:**
- Document Matrix theme color palette
- Reuse Tailwind utility classes
- Copy working patterns from debate UI

### Risk 4: Session Storage Conflicts
**Mitigation:**
- Use separate localStorage keys:
  - Debate: `llm-arena-current-debate`
  - Chat: `llm-arena-chat-session-[sessionId]`
- Use separate Supabase tables

### Risk 5: Auth/Access Code Issues
**Mitigation:**
- Use same cookie-based auth system
- Reuse existing `/api/auth/verify` endpoint
- Query deduction uses same pattern as debate

### Risk 6: Context Window Token Overflow
**Mitigation:**
- Token-budget sliding window (max 4000 tokens)
- Always include minimum last 3 messages
- Estimate tokens conservatively
- Log token usage for monitoring

---

## CODE REUSE STRATEGY

### Direct Imports (Safe)
```typescript
// Shared resources - OK to import
import { PERSONAS, PersonaDefinition } from '@/lib/personas';
import { MODEL_CONFIGS } from '@/lib/orchestrator';
import { getModelDisplayName, getModelColor } from '@/lib/modelConfigs';
import { processDebateTurn } from '@/lib/orchestrator';
import type { AvailableModel, Message } from '@/types';
```

### Copy & Adapt (No Imports)
| Source Component | Destination | Adaptation |
|-----------------|-------------|------------|
| `EnhancedModelSelector` | `ChatModelSelector` | Single model only, remove dual-model logic |
| `PersonaSelector` | `ChatPersonaSelector` | Same design, different state management |
| `AgreeabilitySlider` | `ChatStanceSlider` | Rename to "Opinion Strength", same mechanics |
| `ChatColumn` | `ChatMessage` | Individual message only, no column layout |
| `AudioPlayer` | Copy TTS logic | Same functionality, chat context, NO Supabase caching initially |

---

## TESTING STRATEGY

### Unit Tests (Optional for MVP)
- `useChatSession` hook logic
- System prompt generation
- Token-budget context window management
- Error handling logic

### Integration Tests
- API endpoint responses
- Auth/quota deduction
- Session save/load
- Context window token limits

### Manual Testing Checklist
- [ ] All 35 personas respond in character
- [ ] All models work correctly
- [ ] Extensiveness 1-5 produces different response lengths
- [ ] Stance 0-10 affects character opinions
- [ ] Sessions save to Supabase
- [ ] Sessions load from Supabase
- [ ] TTS works for all personas
- [ ] Navigation works from all pages (Debate/Chat/Library)
- [ ] Library integration works (Chat Sessions tab)
- [ ] Auth/access codes work
- [ ] Query quota decrements correctly
- [ ] Error handling works (all error types)
- [ ] Context window respects token budget
- [ ] Session isolation works (no cross-session memory)
- [ ] No regressions in debate system

---

## NAVIGATION & INTEGRATION

### Header Navigation Update

**Files to Update:**
1. `src/app/page.tsx` (line ~362)
2. `src/app/chat/page.tsx` (new file)
3. `src/app/chat/[sessionId]/page.tsx` (new file)
4. `src/app/library/page.tsx` (existing file)

**Code Pattern:**
```tsx
<motion.div
  initial={{ opacity: 0, x: 50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.5, duration: 0.8 }}
  className="text-right flex items-center gap-6"
>
  <div>
    <p className="text-xs text-matrix-green-dim">QUERIES REMAINING</p>
    <p className="text-sm text-matrix-text font-matrix">{queriesRemaining}</p>
  </div>
  <Link href="/chat" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Character Chat">
    <span role="img" aria-label="Chat">💬</span>
  </Link>
  <Link href="/library" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Open Library">
    <span role="img" aria-label="Library">📚</span>
  </Link>
</motion.div>
```

### Library Integration

**Update `src/app/library/page.tsx`:**
- Add tab state: `activeView: 'debates' | 'chats'`
- Add tab buttons: `[Debates] [Chat Sessions]`
- Filter `MarkedItem[]` for debates tab
- Load chat sessions from Supabase for chats tab
- Display chat session list with preview
- Click session → navigate to `/chat/[sessionId]`

---

## CONFIRMATION CHECKLIST

Before starting Phase 1, confirm understanding:

- [x] Chat sessions do NOT remember previous unrelated chats
- [x] Each new session starts with zero context
- [x] Only saved/resumed sessions maintain their conversation history
- [x] Navigation allows moving between Debate/Chat/Library freely
- [x] Library will have separate tabs for Debates vs Chat Sessions
- [x] Error handling structure must be included from Phase 1
- [x] Token-budget context window (not fixed 10 messages)
- [x] Configuration modal includes all settings upfront
- [x] Session isolation is critical (no cross-session memory)

---

## ESTIMATED TIMELINE

**Total Implementation Time: 10-13 hours**

- **Phase 1 (Foundation):** 3 hours
- **Phase 2 (Intelligence):** 2-3 hours  
- **Phase 3 (Persistence):** 2 hours
- **Phase 4 (Polish):** 2-3 hours
- **Phase 5 (Integration):** 1-2 hours

**Recommended Approach:** Implement phase-by-phase, test thoroughly after each phase before proceeding.

---

## SUMMARY

This revised architecture provides:
✅ **Complete Isolation** - Zero coupling with debate system  
✅ **Code Reuse** - Leverages personas, models, styling via safe imports  
✅ **Scalability** - Easy to add features without affecting debates  
✅ **Maintainability** - Clear boundaries, separate concerns  
✅ **User Experience** - Intuitive, Matrix-themed, familiar patterns  
✅ **Error Handling** - Comprehensive error states from Phase 1  
✅ **Context Management** - Token-budget sliding window  
✅ **Session Isolation** - Ephemeral sessions, no cross-session memory  
✅ **Navigation** - Seamless navigation between Debate/Chat/Library  

**Next Step:** Proceed with Phase 1 implementation, ensuring all refinements are included.


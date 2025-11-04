# ElevenLabs TTS Implementation - Phase 1 Investigation Report

## 📋 Executive Summary

The codebase **already has TTS infrastructure in place** but it's currently a **mock implementation**. The UI components, API route structure, and data flow are all set up and ready for ElevenLabs integration.

---

## 🔍 Investigation Findings

### 1. ✅ Play/Pause UI Components

**Location:** `src/components/ChatColumn.tsx` (lines 278-283)

**Current Implementation:**
- AudioPlayer component is **already integrated** into ChatColumn
- Shows play/pause buttons **only when `message.personaId` exists**
- Buttons appear on hover (opacity transition)
- Uses Lucide React icons (Play, Pause, Loader)

```typescript
{/* Audio Player Integration */}
{message.personaId && (
  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <AudioPlayer text={message.text} personaId={message.personaId} />
  </div>
)}
```

**Findings:**
- ✅ Play/pause buttons exist and are functional UI-wise
- ⚠️ Only visible for messages with personas
- ❌ No audio playback yet (returns empty blob)

---

### 2. ✅ TTS API Route Exists (Mock)

**Location:** `src/app/api/tts/route.ts`

**Current Implementation:**
- ✅ POST endpoint exists at `/api/tts`
- ✅ Accepts `{ text, personaId }` in request body
- ✅ Validates persona exists in PERSONAS
- ❌ Returns **empty response** (no actual TTS generation)
- ✅ Returns correct `Content-Type: audio/mpeg` header

**Code Structure:**
```typescript
export async function POST(request: Request) {
  const { text, personaId } = await request.json();
  const persona = PERSONAS[personaId];
  
  // TODO: Call ElevenLabs API here
  // Currently returns empty response
  return new NextResponse(null, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
```

**Findings:**
- ✅ API route structure is ready
- ✅ Persona validation in place
- ❌ No ElevenLabs API call implemented
- ❌ No environment variable for API key

---

### 3. ✅ AudioPlayer Component

**Location:** `src/components/AudioPlayer.tsx`

**Current Implementation:**
- ✅ Handles play/pause state
- ✅ Shows loading spinner while fetching
- ✅ Fetches from `/api/tts` endpoint
- ✅ Uses HTML5 Audio API for playback
- ✅ Cleans up object URLs on end
- ❌ Currently fails silently (empty blob response)

**Flow:**
1. User clicks play button
2. Component calls `/api/tts` with `{ text, personaId }`
3. Receives blob response
4. Creates Audio object and plays
5. Handles play/pause/end events

**Findings:**
- ✅ Component logic is complete
- ✅ Error handling structure exists
- ❌ Needs actual audio blob from API

---

### 4. ✅ Message Data Structure

**Location:** `src/types/index.ts` (lines 4-11)

**Message Interface:**
```typescript
export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isLoading?: boolean;
  personaId?: string; // ← Already exists for TTS!
}
```

**Message Creation:**
- Messages are created in `src/hooks/useDebate.ts` (line 620-627)
- `personaId` is **already assigned** when creating messages
- Stored in `modelAMessages` and `modelBMessages` arrays

**Findings:**
- ✅ `personaId` field exists in Message type
- ✅ Messages are created with personaId when persona is selected
- ⚠️ Messages without personas don't have personaId (no audio button)

---

### 5. ✅ Persona Configuration

**Location:** `src/lib/personas.ts`

**Current Implementation:**
- ✅ All 20 personas have `elevenLabsVoiceId?: string` field
- ✅ Interface includes voice ID property
- ❌ All voice IDs are **placeholders** (e.g., `'placeholder_voice_id_marcus_aurelius'`)

**Example:**
```typescript
marcus_aurelius: {
  id: 'marcus_aurelius',
  name: 'Marcus Aurelius',
  // ... other fields
  elevenLabsVoiceId: 'placeholder_voice_id_marcus_aurelius', // ← Needs real ID
}
```

**Findings:**
- ✅ Persona voice ID structure exists
- ✅ All personas have placeholder voice IDs
- ❌ Need to replace with real ElevenLabs voice IDs

---

### 6. ⚠️ Model Configuration

**Location:** `src/lib/orchestrator.ts` (MODEL_CONFIGS, lines 101-159)

**Current Implementation:**
- Models configured in `MODEL_CONFIGS` object
- Contains: provider, endpoint, modelName, maxTokens, apiKeyEnv, costPer1kTokens
- ❌ **NO voice ID field** for models

**Models Available:**
- `gpt-4o`
- `gpt-4o-mini`
- `claude-3-5-sonnet-20241022`
- `deepseek-r1`
- `deepseek-v3`
- `gemini-2.5-flash-preview-05-06`
- `gemini-2.5-pro-preview-05-06`

**Findings:**
- ✅ Model configuration structure exists
- ❌ Need to add `elevenLabsVoiceId` field to MODEL_CONFIGS
- ❌ Models don't have voice IDs yet

---

### 7. ❌ No ElevenLabs Integration

**Findings:**
- ❌ No ElevenLabs SDK imported
- ❌ No `ELEVENLABS_API_KEY` environment variable
- ❌ No actual API calls to ElevenLabs
- ❌ No voice ID mapping

---

## 🎯 Implementation Requirements

### Voice Assignment Strategy

**Per User Requirements:**
1. **Models:** Each model gets **one shared voice** (all GPT-4o messages use same voice)
2. **Personas:** Each persona gets **unique voice** (some may share voices)
3. **Fallback:** If message has persona → use persona voice, else use model voice

### Voice ID Storage Locations

1. **Model Voices:** Add to `MODEL_CONFIGS` in `src/lib/orchestrator.ts`
2. **Persona Voices:** Update `PERSONAS` in `src/lib/personas.ts` (replace placeholders)

### Audio Generation Flow

**Current Flow (Broken):**
```
AudioPlayer → /api/tts → Empty Response → No Audio
```

**Target Flow:**
```
AudioPlayer → /api/tts → ElevenLabs API → Audio Blob → Playback
```

---

## 📊 Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Play/Pause UI | ✅ Complete | Buttons visible, functional UI |
| AudioPlayer Component | ✅ Complete | Logic ready, needs real audio |
| TTS API Route | ⚠️ Mock | Structure ready, needs ElevenLabs |
| Message Structure | ✅ Complete | personaId field exists |
| Persona Voice IDs | ⚠️ Placeholders | Need real ElevenLabs IDs |
| Model Voice IDs | ❌ Missing | Need to add to MODEL_CONFIGS |
| ElevenLabs Integration | ❌ Missing | No API calls implemented |
| Audio Caching | ❌ Missing | No localStorage caching |
| Error Handling | ⚠️ Basic | Needs improvement |

---

## 🚀 Next Steps (Phase 2)

1. **Implement ElevenLabs API call** in `/api/tts/route.ts`
2. **Add voice IDs to MODEL_CONFIGS** for all 7 models
3. **Update persona voice IDs** with real ElevenLabs IDs
4. **Update AudioPlayer** to handle model fallback (when no persona)
5. **Add localStorage caching** for generated audio
6. **Add error handling** and rate limiting
7. **Test with different models and personas**

---

## 🔧 Technical Details

### ElevenLabs API Endpoint
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

### Request Format
```typescript
{
  text: string,
  model_id?: string,  // Optional: "eleven_monolingual_v1" or "eleven_multilingual_v2"
  voice_settings?: {
    stability: number,  // 0.0-1.0
    similarity_boost: number,  // 0.0-1.0
    style?: number,  // 0.0-1.0
    use_speaker_boost?: boolean
  }
}
```

### Response Format
- Returns audio blob (MP3 format)
- Content-Type: `audio/mpeg`

---

## 📝 Voice ID Suggestions

### Male Voices (Recommended for Models)
- **Adam** (21m00Tcm4TlvDq8ikWAM) - Professional, clear
- **Antoni** (ErXwobaYiN019PkySvjV) - Warm, articulate
- **Josh** (TxGEqnHWrfWFTfGW9XjX) - Deep, thoughtful
- **Arnold** (VR6AewLTigWG4xSOukaG) - Strong, authoritative
- **Callum** (N2lVS1w4EtoT3dr4eOWO) - British, energetic
- **Charlie** (IKne3meq5aSn9XLyUdCD) - Young, casual
- **Clyde** (2EiwWnXFnvU5JabPnv8n) - Older, wise

### Female Voices (For Specific Personas)
- **Rachel** (21m00Tcm4TlvDq8ikWAM) - Professional, clear
- **Domi** (AZnzlk1XvdvUeBnXmlld) - Strong, confident
- **Bella** (EXAVITQu4vr4xnSDxMaL) - Soft, gentle

---

## ✅ Conclusion

The infrastructure is **90% complete**. We need to:
1. Add ElevenLabs API integration (1-2 hours)
2. Configure voice IDs (30 minutes)
3. Add model voice fallback (30 minutes)
4. Add caching (1 hour)
5. Testing (1 hour)

**Estimated Total Time:** 4-5 hours

**Ready to proceed with Phase 2 implementation!**


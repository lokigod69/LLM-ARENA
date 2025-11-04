# ElevenLabs TTS Implementation Summary

## ✅ Implementation Complete

The ElevenLabs TTS integration has been successfully implemented! The system now supports text-to-speech for both **personas** (unique voices) and **models** (shared voices per model).

---

## 🎯 What Was Implemented

### 1. ✅ ElevenLabs API Integration
**File:** `src/app/api/tts/route.ts`
- Full ElevenLabs API integration
- Supports both persona and model voice fallback
- Error handling for API failures, rate limits, and invalid keys
- Returns audio blob in MP3 format

### 2. ✅ Model Voice Configuration
**File:** `src/lib/orchestrator.ts`
- Added `elevenLabsVoiceId` to all 7 models in `MODEL_CONFIGS`
- Each model has a distinct male voice:
  - **GPT-4o**: Adam (Professional, clear)
  - **GPT-4o Mini**: Josh (Deep, thoughtful)
  - **Claude 3.5 Sonnet**: Arnold (Strong, authoritative)
  - **DeepSeek R1**: Clyde (Technical, wise)
  - **DeepSeek V3**: Charlie (Young, casual)
  - **Gemini 2.5 Flash**: Callum (British, energetic)
  - **Gemini 2.5 Pro**: Antoni (Warm, articulate)

### 3. ✅ AudioPlayer Component Enhancement
**File:** `src/components/AudioPlayer.tsx`
- Supports both persona and model voices
- localStorage caching (24-hour TTL, max 50 entries)
- Automatic cache cleanup when quota exceeded
- Error handling and loading states
- Play/pause functionality

### 4. ✅ ChatColumn Integration
**File:** `src/components/ChatColumn.tsx`
- AudioPlayer now shows for **all messages** (not just personas)
- Passes `modelName` for fallback when no persona
- Play button appears on hover

---

## 🔧 Setup Required

### 1. Environment Variable
Add to your `.env.local` file:

```env
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
```

**Get your API key:**
- Visit: https://elevenlabs.io/
- Sign up / Log in
- Go to Profile → API Keys
- Create a new API key

### 2. Persona Voice IDs (Optional)
**File:** `src/lib/personas.ts`

Currently, all personas have placeholder voice IDs:
- `elevenLabsVoiceId: 'placeholder_voice_id_marcus_aurelius'`

**To assign real voices:**
1. Browse ElevenLabs voice library: https://elevenlabs.io/voice-library
2. Choose voices that match each persona's character
3. Replace placeholder IDs with real voice IDs

**Example:**
```typescript
marcus_aurelius: {
  // ... other fields
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Real voice ID
}
```

---

## 🎵 Voice Assignment Strategy

### Models (Shared Voice Per Model)
- Each model gets **one voice** used for all messages from that model
- Voice is assigned in `MODEL_CONFIGS` in `orchestrator.ts`
- ✅ **Already configured** for all 7 models

### Personas (Unique Voice Per Persona)
- Each persona gets **unique voice** (some may share if desired)
- Voice is assigned in `PERSONAS` in `personas.ts`
- ⚠️ **Currently placeholders** - needs real voice IDs

### Fallback Logic
1. **Priority 1**: If message has `personaId` → use persona voice
2. **Priority 2**: If no persona but has `modelName` → use model voice
3. **Error**: If neither available → show error

---

## 🚀 How It Works

### User Flow
1. User hovers over a message in ChatColumn
2. Play button appears (top-right)
3. User clicks play
4. AudioPlayer checks localStorage cache first
5. If cached → plays immediately
6. If not cached → fetches from `/api/tts`
7. `/api/tts` calls ElevenLabs API
8. Audio blob returned and cached
9. Audio plays via HTML5 Audio API

### Caching Strategy
- **Storage**: localStorage
- **TTL**: 24 hours
- **Max entries**: 50 (auto-cleanup oldest when limit reached)
- **Cache key**: `tts_{voiceId}_{textHash}`

---

## 💰 Cost Considerations

### ElevenLabs Pricing
- **Free tier**: 10,000 characters/month
- **Paid tier**: $5/month for 30,000 characters
- **Per character**: ~$0.0003 (varies by plan)

### Estimated Usage
- Average debate response: ~500 characters
- 10-turn debate: ~5,000 characters
- Free tier: ~2 debates/month
- Paid tier: ~6 debates/month

### Cost Optimization
- ✅ **localStorage caching** prevents regeneration
- ✅ **On-demand generation** (only when user clicks play)
- ⚠️ Consider implementing usage tracking

---

## 🐛 Error Handling

The implementation includes error handling for:

1. **Missing API Key**: Returns 503 "TTS service not configured"
2. **Invalid API Key**: Returns 401 "Invalid ElevenLabs API key"
3. **Rate Limit**: Returns 429 "Rate limit exceeded"
4. **Invalid Voice ID**: Returns 404 "Voice ID not found"
5. **Network Errors**: Catches and logs errors
6. **Playback Errors**: Shows error message to user

---

## 📝 Next Steps (Optional)

### 1. Assign Persona Voices
Update `src/lib/personas.ts` with real ElevenLabs voice IDs for each persona.

### 2. Usage Tracking
Add usage tracking to monitor character consumption:
- Track per user/session
- Display usage stats
- Warn when approaching limits

### 3. Voice Selection UI
Allow users to:
- Preview voices before assigning
- Change voice assignments
- Test voices with sample text

### 4. Advanced Features
- **Queue management**: Play multiple messages in sequence
- **Playback speed**: Adjust speech rate
- **Volume control**: Per-message volume
- **Progress indicator**: Show playback progress

---

## ✅ Testing Checklist

- [x] TTS API route implemented
- [x] Model voices configured
- [x] AudioPlayer supports persona/model fallback
- [x] ChatColumn shows audio for all messages
- [x] Caching implemented
- [x] Error handling added
- [ ] **Test with real ElevenLabs API key** (requires API key)
- [ ] **Test persona voices** (requires voice ID updates)
- [ ] **Test model voices** (requires API key)
- [ ] **Test caching behavior**
- [ ] **Test error scenarios**

---

## 🎉 Ready to Use!

The implementation is complete and ready for testing. Just add your `ELEVENLABS_API_KEY` to `.env.local` and start listening to debates!

**Note**: Persona voices will need to be updated with real voice IDs from ElevenLabs voice library.

---

## 📚 References

- **ElevenLabs API Docs**: https://elevenlabs.io/docs/api-reference/text-to-speech
- **Voice Library**: https://elevenlabs.io/voice-library
- **Pricing**: https://elevenlabs.io/pricing


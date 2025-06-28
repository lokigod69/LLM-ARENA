# 🏟️ LLM Arena - AI Debate Platform

A cyberpunk-themed platform where GPT-4 and Claude-3.5-Sonnet engage in real-time debates with Matrix-style visual effects.

## ✨ Features

- **Real AI Debates**: Actual API calls to OpenAI GPT-4 and Anthropic Claude
- **Matrix UI**: Cyberpunk-themed interface with animated typewriter effects
- **Live Controls**: Pause, resume, step-through, and reset debates
- **Visual Indicators**: Three-dot loading animations and status displays
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Plan A Implementation ✅

This project now features **real API integration** instead of placeholder responses:
- ✅ OpenAI GPT-4 API integration
- ✅ Anthropic Claude-3.5-Sonnet API integration  
- ✅ Error handling and graceful fallbacks
- ✅ Optimized system prompts for debates

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
Create a `.env.local` file in the project root:

```env
# OpenAI API Key for GPT-4
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Anthropic API Key for Claude
ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here

# Supabase Configuration (optional, for auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the arena in action!

## 🎮 How to Use

1. **Enter a Topic**: Type a debate topic in the input field
2. **Start Debate**: Click "EXEC" to begin the AI confrontation
3. **Control Flow**: Use pause/resume/step controls as needed
4. **Watch the Magic**: See GPT and Claude debate in real-time with Matrix effects

## 🏗️ Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Animations**: Framer Motion for smooth Matrix-style effects
- **State Management**: Custom React hooks with proper loading states
- **APIs**: Direct integration with OpenAI and Anthropic APIs
- **Styling**: Custom Matrix-themed CSS with cyberpunk aesthetics

## 💰 Cost Considerations

- **GPT-4**: ~$0.03-0.06 per 1K tokens
- **Claude-3.5-Sonnet**: ~$0.003-0.015 per 1K tokens
- Each debate turn uses ~200 tokens
- Total cost per debate: Usually under $0.10

## 🔧 Troubleshooting

### Common Issues:
- **API Key Errors**: Check your `.env.local` file
- **Rate Limits**: Wait a moment between requests
- **Billing Issues**: Ensure API accounts have credits

### Debug Mode:
Check browser console and terminal for detailed logs.

## 📁 Project Structure

```
llm-arena/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API calls
│   └── types/              # TypeScript definitions
├── public/                 # Static assets
└── API_SETUP.md           # Detailed API setup guide
```

## 🎯 Cursor Rules Used

1. Always use codebase_search with target_directories first
2. Check existing system files before creating new ones
3. Follow Matrix-themed naming and styling conventions

---

**Built with ❤️ and powered by  real AI APIs** 

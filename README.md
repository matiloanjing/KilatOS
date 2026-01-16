# KilatOS

<p align="center">
  <strong>⚡ AI-Powered Code Generation OS</strong>
</p>

<p align="center">
  Build complete web applications in seconds with conversational AI
</p>

---

## 🚀 Features

### Multi-Agent AI System
- **12 Specialized AI Agents** - Planner, Coder, Reviewer, Deployer, and more
- **Planning Mode** - For complex projects with architectural planning
- **Fast Mode** - Quick generation for simple requests
- **Self-Healing Code** - Automatic error detection and fixing

### Real-Time Code Preview
- **WebContainer Integration** - Full Node.js runtime in browser
- **Live Preview** - See your app running instantly
- **Monaco Editor** - VS Code-powered editing experience

### AI Capabilities
- **Multi-Model Support** - Groq, OpenAI, Gemini, Pollinations (28+ models)
- **Intelligent Routing** - Automatic model selection based on task
- **Rate Limiting & Fallbacks** - Robust error handling
- **Context Memory** - Session-aware conversations

### Developer Experience
- **Code Export** - Download as ZIP or push to GitHub
- **Syntax Highlighting** - Support for 50+ languages
- **File Explorer** - Navigate generated projects easily
- **Multi-language** - English and Indonesian support

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS |
| Backend | Next.js API Routes, Server Actions |
| Database | Supabase (PostgreSQL) |
| Auth | NextAuth.js + Supabase Auth |
| AI | Groq, OpenAI, Gemini, Pollinations API |
| Editor | Monaco Editor |
| Preview | WebContainer API |
| Embeddings | Xenova Transformers (384-dim) |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/matiloanjing/KilatOS.git
cd KilatOS

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Create `.env.local` with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Models (at least one required)
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_gemini_api_key

# Optional
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

---

## 📁 Project Structure

```
KilatOS/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   ├── kilatcode/          # Code Generation UI
│   ├── chat/               # Chat Interface
│   └── admin/              # Admin Dashboard
├── components/             # React Components
│   ├── ui/                 # UI Components
│   ├── Monaco Editor       # Code Editor
│   └── WebContainer        # Preview Component
├── lib/                    # Core Libraries
│   ├── ai/                 # AI Integration
│   │   ├── mandor.ts       # AI Request Handler
│   │   ├── tier-router.ts  # Model Selection
│   │   └── rate-limiter.ts # Rate Limiting
│   ├── agents/             # Multi-Agent System
│   │   ├── codegen/        # Code Generation
│   │   └── orchestrator/   # Agent Orchestration
│   └── executor/           # Code Execution
└── hooks/                  # React Hooks
```

---

## 🎯 Usage

### Generate a Web App
1. Open KilatOS at `/kilatcode`
2. Describe your app: "Create a Spotify clone with dark theme"
3. Watch AI plan and generate your app
4. Preview the running app in-browser
5. Download or deploy to Vercel

### Modes
- **Planning Mode**: Best for complex apps (e-commerce, dashboards)
- **Fast Mode**: Quick for simple components (buttons, forms)

---

## 📄 License

MIT License - KilatCode Studio 2026

---

## 🔗 Links

- **Website**: [kilatos.com](https://kilatos.com)
- **Discord**: [discord.gg/kilatos](https://discord.gg/kilatos)

---

<p align="center">
  <strong>Built with ❤️ by KilatCode Studio</strong>
</p>

# KilatOS

<p align="center">
  <strong>⚡ AI-Powered Code Generation Operating System</strong>
</p>

<p align="center">
  Build complete web applications in seconds with conversational AI
</p>

---

## 🎯 What is KilatOS?

KilatOS is an intelligent development environment that combines **13 specialized AI agents**, a **self-improving learning system**, and a **hybrid IDE experience** to generate production-ready code through natural conversation.

**Live Production Stats:**
- 🤖 **13 AI Agents** specialized for different tasks
- 💾 **40 Database Tables** + 6 Analytics Views
- 📦 **297 Projects Generated** in production
- 🧠 **522 Knowledge Base Embeddings** (self-learning)
- ⚡ **48 API Endpoints** powering the system

---

## ⚡ Key Features

### 🤖 13 Specialized AI Agents
Each agent is an expert in its domain:
- **KilatCode** - Full-stack code generation
- **KilatDesign** - UI/UX design & mockups
- **KilatResearch** - Deep research with citations
- **KilatSolve** - STEM problem solving
- **KilatAudit** - Code review & security
- **+ 8 more agents** - Docs, Guides, Content, Quiz, Ideas, Web Scraping...

### 🧠 Skynet Learning System
The AI gets smarter with every interaction:
- **RLHF** - Learns from your feedback (👍/👎)
- **Pattern Recognition** - Promotes successful code patterns
- **User Memory** - Remembers your preferences
- **Self-Improving** - 57 proven patterns discovered automatically

### 💻 Hybrid IDE Experience
- **Monaco Editor** - Full VS Code experience in browser
- **Live Preview** - See your app running instantly
- **WebContainer** - Runs Node.js natively in Chrome (localhost)
- **File Explorer** - Complete project management

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend** | Next.js API Routes (48 endpoints) |
| **Database** | Supabase PostgreSQL (40 tables) |
| **Cache** | Upstash Redis (distributed, 5 patterns) |
| **AI** | Groq, Pollinations, OpenAI, Gemini |
| **Editor** | Monaco Editor |
| **Embeddings** | Xenova Transformers (384-dim) |

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/KilatOS.git
cd KilatOS

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
# Open http://localhost:3000
```

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Models (at least one required)
GROQ_API_KEY=your_groq_key              # Primary (Fast)
POLLINATION_API_KEY=your_pollination_key # Fallback (Free)

# Redis Cache (recommended)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

---

## 📖 Usage

### Generate a Web App

1. Navigate to `/kilatcode`
2. Describe your app: *"Create a landing page for crypto ICO"*
3. AI generates complete project (15+ files)
4. Preview instantly in browser
5. Download or deploy to Vercel

### Use Other Agents

- `/kilatdesign` - Generate UI mockups & images
- `/kilatresearch` - Deep research with citations
- `/kilatsolve` - Solve math/physics problems
- `/kilatguide` - Create step-by-step tutorials
- `/kilatwrite` - Write blog posts & content
- **+ 8 more specialized agents**

---

## 📊 System Architecture

```
User Request
     ↓
Frontend (35 Pages) → API Layer (48 Routes)
     ↓
MasterOrchestrator → Agent Router
     ↓
13 AI Agents → AI Gateway → LLM Models
     ↓                ↓
RAG System      Skynet Learning
     ↓                ↓
Supabase (40 Tables) + Redis Cache
```

**For detailed technical documentation, see [SYSTEM_BLUEPRINT.md](docs/SYSTEM_BLUEPRINT.md)**

---

## 🧠 Self-Improving AI

KilatOS learns from every interaction:

```
User Feedback → RLHF Analysis → Prompt Adjustments
                      ↓
            Pattern Recognition → Knowledge Base
                      ↓
              Better Results Next Time
```

**Current Learning Stats:**
- 57 proven patterns discovered
- 327 requests analyzed
- 93 user feedback entries
- 225 performance metrics tracked

---

## ⚠️ Known Issues

### WebContainer (Live Preview)
- ✅ **Works on localhost** - Full functionality
- ❌ **Broken on Vercel** - Requires COOP/COEP headers
- **Solution:** Use Sandpack or deploy to StackBlitz for production

---

## 📄 Documentation

- **[SYSTEM_BLUEPRINT.md](docs/SYSTEM_BLUEPRINT.md)** - Complete technical architecture
- **[CLAUDE.md](CLAUDE.md)** - AI context & development guide
- **Database Schema** - 40 tables documented in SYSTEM_BLUEPRINT.md

---

## 🗺️ Roadmap

- [x] 13 AI Agents
- [x] Self-improving learning system (Skynet)
- [x] RAG knowledge base (522 embeddings)
- [x] WebContainer preview (localhost)
- [x] Distributed Redis cache
- [ ] Fix WebContainer for Vercel production
- [ ] Multi-model support (Claude, GPT-4)
- [ ] Real-time collaboration
- [ ] Mobile app

---

## 📄 License

MIT License - KilatCode Studio 2026

---

## 🔗 Links

- **Live Demo:** [kilatos.vercel.app](https://kilatos.vercel.app)
- **Documentation:** [SYSTEM_BLUEPRINT.md](docs/SYSTEM_BLUEPRINT.md)
- **Discord:** [discord.gg/kilatos](https://discord.gg/kilatos)

---

<p align="center">
  <strong>Built with ❤️ by KilatCode Studio</strong><br/>
  <em>Last verified: 2026-01-23</em>
</p>

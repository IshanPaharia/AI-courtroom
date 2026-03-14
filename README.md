# AI Courtroom

Settle friendly disputes with an AI Judge. File a case, argue your side in real-time, and get a verdict — compensation included.

Built for resolving the important conflicts in life: who ate whose leftovers, who picks the movie tonight, and who owes who a coffee.

---

## Features

**Real-Time Courtroom** — Both parties argue simultaneously in a live chat powered by WebSockets. The AI judge watches, comments, issues warnings, and can mute you if you get out of line.

**AI Judge Personas** — Choose your judge's personality:
- **Strict Judge** — By the book. No nonsense.
- **Chill Judge** — Laid back. Vibes-based justice.
- **Drama Queen** — Soap opera energy. Maximum drama.
- **Pirate Judge** — Arrr! Maritime law applies.

**Objection System** — Each side gets 2 objection tokens per case. Use them to force the judge to immediately address your point. Use them wisely.

**Evidence Uploads** — Attach images or PDFs (up to 3MB) as evidence to strengthen your argument, stored via Cloudinary.

**Appeals Court** — Lost the verdict? Appeal it. A new case is created with the same judge persona for a second hearing.

**Force Verdict** — Both parties can vote to force an immediate verdict (requires 2/2 agreement).

**Share Verdict** — Share the final ruling via the Web Share API or clipboard.

**Leaderboard** — Track win rates, total cases, and see who the most convincing arguer is.

**Dark Mode** — Toggle between light and dark themes.

**Any Compensation** — Demand anything: snacks, favors, public apologies, the TV remote for a week.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Framer Motion, React Router v7 |
| Backend | Node.js, Express v5, Socket.io |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Clerk |
| AI | OpenRouter (GPT-4o-mini, Gemini, Llama, Claude fallbacks) |
| Storage | Cloudinary |
| Hosting | Render |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application (for auth)
- An [OpenRouter](https://openrouter.ai) API key
- A [Cloudinary](https://cloudinary.com) account (for evidence uploads)

### Setup

1. **Clone the repo**

```bash
git clone https://github.com/IshanPaharia/AI-courtroom.git
cd AI-courtroom
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```
DATABASE_URL=postgresql://...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=3001
```

4. **Push the database schema**

```bash
npm run db:push
```

5. **Start development servers**

In two terminals:

```bash
npm run dev:server   # Express + Socket.io on port 3001
npm run dev          # Vite dev server on port 5173
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
AI-Courtroom/
├── server/
│   ├── db/              # Drizzle schema & connection
│   ├── middleware/       # Clerk auth middleware
│   ├── prompts/         # AI judge persona definitions
│   ├── routes/          # REST API routes (cases, users, upload, arguments)
│   ├── services/        # OpenRouter AI client, Cloudinary upload
│   ├── socket/          # Socket.io real-time courtroom handler
│   └── index.js         # Express server entry point
├── src/
│   ├── components/      # Navbar, Layout, CaseCard
│   ├── context/         # ThemeContext (dark mode)
│   ├── lib/             # Utilities, mock data, judge personas
│   ├── pages/           # All page components
│   ├── services/        # API client
│   ├── App.jsx          # Router setup
│   └── index.css        # Tailwind config + neobrutalist theme
├── .env.example
├── package.json
└── vite.config.js
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run dev:server` | Start Express server with hot reload |
| `npm run build` | Build frontend for production |
| `npm start` | Run production server (serves built frontend) |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

---

## How It Works

1. **File a Case** — Describe the conflict, choose a judge persona, and set your demanded compensation.
2. **Share the Invite** — Send the invite link to the defendant.
3. **Argue in Real-Time** — Both parties chat live while the AI judge watches, interjects, and can issue timeouts.
4. **Get the Verdict** — The judge delivers a ruling with a winner, compensation decision, drama score, and a notable quote.
5. **Appeal (Optional)** — The losing party can appeal for a second hearing.

---

## Design

The UI uses a **Neobrutalist** design system — thick borders, hard offset shadows, bold colors, and chunky typography. Primary color is gold/yellow with high-contrast black accents. Fully responsive from mobile to desktop.

---

## License

MIT

# Climbing Tracker

This is a [Next.js](https://nextjs.org) app for tracking climbing sessions, routes, and related feedback flows.

## Set Up a New Dev Environment

### 1) Prerequisites

- Node.js 20+ (LTS recommended)
- npm (this repo uses `package-lock.json`)
- A Supabase project (URL + anon key)
- (Optional) A Resend API key for email feedback endpoints

### 2) Clone and install

```bash
git clone <your-repo-url>
cd climbing-tracker
npm install
```

### 3) Configure environment variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Then update values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: used by /api/send-feedback-email
RESEND_API_KEY=your-resend-api-key
FEEDBACK_TO_EMAIL=your-email@example.com
FEEDBACK_FROM_EMAIL=onboarding@resend.dev
```

### 4) Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5) Validate your setup

- App loads at `http://localhost:3000`
- No missing env-var errors in terminal
- Auth/Supabase-backed features can read/write as expected
- (If configured) feedback email API works

## Useful Scripts

```bash
npm run dev        # Start local dev server
npm run build      # Build for production
npm run start      # Run production build
npm run lint       # Run ESLint
npm run type-check # Run TypeScript checks
```

## Troubleshooting

- `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing:
  ensure they are set in `.env.local`, then restart the dev server.
- Port 3000 already in use:
  stop the conflicting process or run on another port (`npm run dev -- --port 3001`).
- Dependency install issues:
  remove `node_modules` and `package-lock.json`, then run `npm install` again.

# World Cup 2026 Predictor

Predict the World Cup round by round. Compete on the **global public leaderboard** or in **private friend leagues**.

## Features

- **Round-by-round predictions** — Group MD1 → MD2 → MD3 → Group Winners → Knockout rounds
- **Global tournament** — Create a team, play solo, appear on public rankings (`/rankings`)
- **Friend leagues** — Private groups with invite codes; global picks copy over when you join
- **Live scoreboards** — Realtime leaderboard updates via Supabase
- **Mobile-first UI** — Large tap targets, sticky submit bar, responsive layout

## Stack

React + Vite + Tailwind · Supabase · Vercel

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase project

Create a project at [supabase.com](https://supabase.com). Run SQL in the **SQL Editor** in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rounds_and_global.sql`
3. `supabase/seed/matches.sql`

Set admin password (must match `.env.local`):

```sql
UPDATE app_settings SET admin_password = 'your-secret-password' WHERE id = 1;
```

### 3. Environment

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSWORD=your-secret-password
```

### 4. Google OAuth (optional)

In **Supabase Dashboard**:

1. **Authentication → Providers → Google** → Enable
2. Add your Google OAuth Client ID & Secret ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
3. **Authentication → URL Configuration** → add redirect URLs:
   - `http://localhost:5173/auth/callback` (local)
   - `https://your-domain.vercel.app/auth/callback` (production)

### 5. Email verification

**Authentication → Providers → Email** → enable **Confirm email**.

Users who sign up with email must click the link in their inbox before logging in.

### 6. Run

```bash
npm run dev
```

## User flows

### Global tournament
1. Sign up → Dashboard → **Enter Tournament** (set team name)
2. Make picks each round at `/play`
3. View worldwide rank at `/rankings` (public, no login required)

### Friend league
1. Dashboard → Create or Join league
2. If you already play globally, your picks are **copied** into the league automatically
3. Compete on the league scoreboard at `/group/:id`

## Admin (`/admin`)

- **Open Prediction Round** — switches which matches users can pick (MD1, MD2, MD3, Group Winners, R32, etc.)
- **Add Knockout Match** — insert Round of 32+ fixtures as the bracket is known
- Enter scores, lock matches, set group winners

## Prediction rounds

| Round | Key | Content |
|-------|-----|---------|
| 1 | `group_md1` | 24 matches (matchday 1) |
| 2 | `group_md2` | 24 matches (matchday 2) |
| 3 | `group_md3` | 24 matches (matchday 3) |
| 4 | `group_winners` | Pick 1st place in each of 12 groups |
| 5+ | `round_of_32`, etc. | Knockout (admin adds matches) |

Only Round 1 is visible initially. Admin opens each round when ready.

## Scoring

| Prediction | Points |
|------------|--------|
| Correct winner/draw | 2 |
| Correct group winner | 5 |
| Exact score (optional) | +1 |

## Deploy to Vercel

Push to GitHub → import in Vercel → add env vars → deploy.

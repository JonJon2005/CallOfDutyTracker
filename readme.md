# COD Camo Tracker

Manual, player-driven tracker for Call of Duty camos, reticles, and account progress. There is **no Call of Duty or Activision API usage**; everything is user-entered.

## What’s in the app
- **Auth**: Email/password via Supabase. Login accepts email or username (username resolves to email server-side).
- **Account progress**: Update level, prestige (incl. Master prestige), and Activision ID in `/accounts`.
- **Camo tracker**: Per-class weapon tracking with mastery badges, “check all” helpers, and per-gamemode filters (MP, Zombies, Warzone, Endgame).
- **Reticle tracker**: Track reticle unlocks by optic and gamemode with ordered requirements.
- **Activity logging**: Server route `/api/logs` records notable events to a `logs` table (requires service role key).
- **No external game APIs**: All data is stored in Supabase tables you control.

## Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Auth/DB**: Supabase (client + server components)
- **Styling**: Tailwind CSS

## Environment variables
Create `.env.local` with at least:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Optional publishable fallback used in code
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...

# Required for server-side logging + username resolution
SUPABASE_SERVICE_ROLE_KEY=...
```

## Local development
1) Install deps: `npm install`
2) Add `.env.local` (see above).
3) Run dev server: `npm run dev` and open http://localhost:3000.
4) Sign up in the UI, then:
   - Update level/prestige in `/accounts`
   - Track camos in `/camos`
   - Track reticles in `/reticles`

## Scripts
- `npm run dev` — start Next.js in development
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — lint codebase

## Deployment
- Deploy to Vercel (or any Node host) with the same env vars set.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is present so `/api/logs` and username resolution work server-side.

## Notes
- Data is manual-only; the app will not call Activision/COD APIs.
- If image optimization quality matters in production, install `sharp` for faster Next.js image handling.

## Disclaimer
- Not affiliated with Activision or Call of Duty.
- All stats are user-entered and stored in your Supabase project. No game APIs are queried. 

# Next Move Portal

Client portal for Curt Sassak's career strategy program. Clients sign in with an emailed link; the Positioning tool runs on Claude; Curt approves positioning from the admin view.

## Setup (one time)

1. **Supabase database:** SQL Editor → New query → paste `supabase/schema.sql` → Run.
2. **Supabase sign-in links:** Authentication → URL Configuration
   - Site URL: your live site, e.g. `https://clients.curtsassak.net` (or the Vercel URL)
   - Redirect URLs: add `https://YOUR-SITE/auth/callback` and `http://localhost:3000/auth/callback`
3. **Vercel:** import this repo, then add Environment Variables (see `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`. Deploy.

## Where things live

- Positioning instructions: `lib/prompts/positioning.ts`
- Client home and tool cards: `app/home/page.tsx`
- Admin: `app/admin/`

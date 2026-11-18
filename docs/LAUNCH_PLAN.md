# Launch plan

The business plan and to-do list (setup without an LLC, two-week launch checklist, costs, strategy,
targets, risks, months 2–6) lives in the editable doc **ReadyPlan Launch Plan** in Claude:
https://claude.ai/artifact/2PhkwQEyQ45Wa3TNAKGS7k

## Technical go-live checklist (summary)

1. Supabase: create the project, run `supabase/migrations/0001`–`0003` in order, then `npm run seed`.
2. Resend: verify the sending domain (SPF, DKIM, DMARC) and add the webhook (`/api/webhooks/resend`).
3. Cloudflare Turnstile: create a widget for the domain.
4. Vercel (Pro plan for commercial use): import the repo, set every variable in `.env.example`, deploy, attach the domain.
5. Set `MAILING_ADDRESS`, `ADMIN_EMAILS`, `NEXT_PUBLIC_LEGAL_NAME`, `CRON_SECRET`, `APP_ENCRYPTION_KEY`, `SESSION_SECRET`.
6. Smoke test on a phone: build a plan, email it, open it in Gmail and iOS Mail, check both PDFs, unsubscribe, delete data.
7. In `/admin`: mark catalog items reviewed; after Amazon Associates approval, paste the tag.
8. Have a lawyer review `/terms` and `/privacy` (templates).

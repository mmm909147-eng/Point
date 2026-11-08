# Al-Raqi store (Vercel + Resend)

`index.html` is the store (served at `/`). `api/` holds the serverless routes:
`POST /api/send-email` (types: admin-code, welcome, notify) and `POST /api/verify-code`.
All email goes through Resend. The API key exists only in Vercel environment variables.

## Setup (domain: alraqiksa.shop)
1. In Resend: create an API key, then add and verify `alraqiksa.shop` under Domains (add the DNS records Resend shows).
2. Import this repository into Vercel (Framework: Other, no build command) and attach the domain `alraqiksa.shop`.
3. In Vercel > Settings > Environment Variables add everything from `.env.example`, then redeploy.
   Until the domain is verified, keep `MAIL_FROM=Al-Raqi <onboarding@resend.dev>`; Resend only delivers that sender to your own Resend account email.
   After verification, change it to `Al-Raqi <noreply@alraqiksa.shop>` so customers receive their emails.
4. The store calls `/api` on the same domain automatically.

## Routes
- `admin-code`: server generates a 6-digit code, emails it to ADMIN_EMAIL, returns a signed token (never the code).
- `verify-code`: checks code + token (10-minute expiry).
- `welcome`: account verification email to the customer.
- `notify`: order and financial alerts to NOTIFY_EMAILS (extra fields in `data` are appended to the message).

## Responses
Success: `{ "ok": true }` (admin-code also returns `token`).
Failure: `{ "ok": false, "error": "description" }` with a 4xx/5xx status.

## Publishing changes to GitHub
    git add .
    git commit -m "Send all email through Resend"
    git push
Vercel redeploys automatically after the push.

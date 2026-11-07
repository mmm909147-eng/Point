# Al-Raqi store (Vercel + Resend)

`index.html` is the store (served at `/`). `api/` holds the serverless routes:
`POST /api/send-email` (types: admin-code, welcome, notify) and `POST /api/verify-code`.
All email goes through Resend. The API key exists only in Vercel environment variables.

## Setup
1. In Resend: create an API key and verify your sending domain (Domains).
2. Import this repository into Vercel (Framework: Other, no build command).
3. Add the variables from `.env.example` in Vercel > Settings > Environment Variables, then redeploy.
   While testing, `MAIL_FROM=onboarding@resend.dev` only delivers to your own Resend account email.
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

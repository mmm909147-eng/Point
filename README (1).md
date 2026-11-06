# Al-Raqi email backend (Vercel + Resend)

Routes: `POST /api/send-email` (types: admin-code, welcome, notify) and `POST /api/verify-code`.

1. Put the `api/` folder at the root of a Vercel project (or in the project that hosts the store).
2. In Vercel > Settings > Environment Variables add everything in `.env.example`.
   The Resend key lives only there. Never put it in the store page.
3. Verify your sending domain in Resend; MAIL_FROM must use it.
4. Deploy, then in the store: Admin > Email settings > "Email backend URL",
   enter `https://YOUR-PROJECT.vercel.app/api`.
5. Set ALLOWED_ORIGIN to the domain that serves the store.

Notes: rate limiting is per function instance. Codes are signed with CODE_SECRET and expire in 10 minutes.

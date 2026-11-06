# Al-Raqi email backend (Vercel + Resend)

Routes: `POST /api/send-email` (types: admin-code, welcome, notify) and `POST /api/verify-code`.

0. This folder is the whole project: `index.html` (store, served at `/`) and `api/` (serverless routes). Import it into Vercel as-is (Framework: Other, no build command).
1. Because the store and API share one domain, the store already uses `/api` as its email backend URL.
2. In Vercel > Settings > Environment Variables add everything in `.env.example`.
   The Resend key lives only there. Never put it in the store page.
3. Verify your sending domain in Resend; MAIL_FROM must use it.
4. Deploy. Test: Admin > sign in; the 6-digit code arrives by email via Resend.
   (Admin > Email settings > Email backend URL can be changed if the API lives elsewhere.)
5. Set ALLOWED_ORIGIN to the domain that serves the store.

Notes: rate limiting is per function instance. Codes are signed with CODE_SECRET and expire in 10 minutes.

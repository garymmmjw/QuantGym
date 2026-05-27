# Product Status

This file keeps product state and roadmap notes out of the root README.

## Current Beta

- Private beta deployment targets Cloudflare Pages for the web app and Render for the API and LLM proxy.
- Closed beta access is controlled by `QUANTGYM_BETA_EMAIL_ALLOWLIST` on the API service.
- Email verification uses SMTP, currently documented for Resend.
- The frontend build writes deployment endpoints into `dist/config.js`.

## Completed Areas

- Cream / lavender / blue UI system with sidebar, top search, account chips, streak chip, score chip, Quant Wire, and generated mascot assets.
- Dashboard, prep plan, mock interview, interview experience notes, problem bank, skills radar, resume, jobs, community, network, mental math, news, and resources modules.
- Public problem bank with 10 active sources and 2,771 compiled problems.
- Personal favorites, problem social likes/comments, hot ranking, last score tracking, and mock-interview reuse.
- Email registration/login, cloud sync, localStorage fallback, and SQLite-backed state.
- LLM proxy for mock interviews, short feedback, study-log classification, resume advice, and RSS-based news.
- LeetCode Hot 100 tracking panel and Chrome extension prototype.

## Known Limits

- The frontend is still a static, mostly single-file app. A Vite/module split would make larger changes easier.
- SQLite is fine for private beta and small groups. A public multi-user release should move to Postgres.
- Password reset, rate limiting, admin tooling, audit logs, and monitoring are still minimal.
- Google login uses a dependency-free beta path. A public release should use a formal Google/JWT verifier.
- Uploaded images/videos may still be stored as data URLs in JSON state. Larger usage should move media to object storage.
- The jobs module has structure and sample data, but no production crawler or jobs API yet.
- The Chrome extension is still a local prototype and defaults to local development unless configured.
- QuantGuide and other private/problem-source licensing boundaries must be reconfirmed before public or commercial distribution.

## Recommended Next Steps

1. Run a 3 to 10 person private beta through registration, sync, problem practice, mock interviews, and resume flows.
2. Watch Render logs, Resend delivery, and OpenAI spend during the beta.
3. Add password reset, basic rate limits, error monitoring, and a small admin surface.
4. Move large/private local artifacts out of Git and keep generated runtime assets only.
5. Connect the jobs module to a real internship/full-time data source.
6. Convert the frontend to a modern module build once the beta surface stabilizes.

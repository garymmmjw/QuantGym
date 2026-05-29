# QuantGym API Server

SQLite-backed API for QuantGym accounts, public and user problem catalogs, per-user problem states, training state, resources, history, network notes, and community posts.

## Start

From the project root:

```bash
python3 api-server/server.py
```

Default API base:

```text
http://127.0.0.1:8790/api
```

The SQLite file is created at:

```text
api-server/data/quantgym.sqlite3
```

## Configuration

Optional environment variables:

```bash
export PORT=8790
export QUANTGYM_HOST="0.0.0.0"
export QUANTGYM_DB="/var/data/quantgym.sqlite3"
export QUANTGYM_PROBLEM_CATALOG="/absolute/path/problem-catalog.json"
export QUANTGYM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export QUANTGYM_SESSION_DAYS=30
export QUANTGYM_BETA_EMAIL_ALLOWLIST="tester1@example.com,tester2@example.com"
export QUANTGYM_GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
export QUANTGYM_REQUIRE_EMAIL_VERIFICATION=1
export QUANTGYM_EMAIL_CODE_TTL_MINUTES=10
export QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS=60
export QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0
export QUANTGYM_SMTP_HOST="smtp.resend.com"
export QUANTGYM_SMTP_PORT=587
export QUANTGYM_SMTP_USERNAME="resend"
export QUANTGYM_SMTP_PASSWORD="<Resend API key>"
export QUANTGYM_SMTP_FROM="QuantGym <no-reply@quantgym.app>"
```

For local development, CORS defaults to `*` and `QUANTGYM_HOST` defaults to `127.0.0.1`. For deployment, set `QUANTGYM_ALLOWED_ORIGINS` to the production web origin and set `QUANTGYM_HOST=0.0.0.0` only when the platform or reverse proxy needs a non-loopback listener.

Set `QUANTGYM_BETA_EMAIL_ALLOWLIST` during a closed beta to accept only those exact email addresses for local-account registration/login and Google cloud sessions. Leave it empty for local development.

Email verification is required for local-account cloud registration by default. If SMTP is not configured, the API uses local development mode: it prints the 6-digit code in the API terminal and, by default, returns `devCode` in the JSON response. Set `QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0` outside local development. Configure the SMTP variables above to send real email.

## Endpoints

- `GET /api/health`
- `POST /api/auth/verification-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/account`
- `PATCH /api/account`
- `GET /api/leaderboard`
- `GET /api/state`
- `PUT /api/state`
- `GET /api/problems`
- `PUT /api/problems`
- `DELETE /api/problems/:id`
- `GET /api/problem-states`
- `PUT /api/problem-states`
- `GET /api/problem-social`
- `GET /api/problem-social/:id`
- `POST /api/problem-social/:id/like`
- `POST /api/problem-social/:id/comments`
- `DELETE /api/problem-social/:id/comments/:commentId`
- `GET /api/community`
- `PUT /api/community`
- `POST /api/sync`

Authenticated endpoints use:

```text
Authorization: Bearer <token>
```

## Notes

- Email/password accounts are hashed server-side with PBKDF2 before storage.
- Public question-bank problems are imported into the `problems` table from `../data/problem-catalog.json` when the API starts.
- User-added problems live in the `problems` table with user visibility. Private favorites, practice counters, and latest interview scores live in `user_problem_states`.
- Shared problem likes and comments live in `problem_likes` and `problem_comments`. Social mutations require an authenticated account, and comment deletion is limited to its author.
- Google cloud login requires `QUANTGYM_GOOGLE_CLIENT_ID` and a Google ID token. The dependency-free beta API derives the Google user id/email from Google's token validation response instead of trusting frontend account fields. Replace the tokeninfo-based verifier with a Google/JWT verification library before a public production launch.
- Uploaded images/videos are still stored as data URLs inside the JSON state/community payload. For production, move media to object storage and store URLs in SQLite.

# Invitation-only registration

New accounts require an invitation and a verified email identity. Existing users
continue to sign in and reset their passwords without an invitation. A first
Google sign-in also requires an invitation; Google's verified email identity
satisfies email verification for that registration.

## Administrator workflow

Sign in as an existing cloud administrator, open **账户与设置 → 邀请码管理**
(`account?section=invitations`), then:

1. Choose a quantity, registrations per code and validity period. Defaults are
   one code, one registration and seven days. An optional email restriction
   reserves the code for a specific recipient.
2. Select **生成邀请码** and copy the returned codes. Full codes are shown only
   after creation. They are not recoverable after leaving the page.
3. Share a code with the intended user through your preferred channel.
4. Review usage and expiry in the same page. **停用** prevents further signups
   without affecting accounts that have already registered.

Administrator access uses the existing `QUANTGYM_ADMIN_EMAILS` or server-managed
admin account tier. A client-supplied profile does not grant admin rights.

## Registration flow

1. The user enters their invitation, name, email and password.
2. The API checks the invitation before sending an email verification code.
3. The user enters their email verification code.
4. The API checks the invitation again and creates the account while redeeming
   the invitation in the same database transaction.

An email-send failure, wrong verification code or failed registration does not
use up a code. Simultaneous requests cannot exceed its use limit. Invalid,
expired, revoked, exhausted and wrong-recipient invitations are rejected.
Failed cloud signup does not create a local account as a substitute.

## Deployment and migration

Set `QUANTGYM_REQUIRE_INVITE_CODE=1` on the API service; this is also the code
default. In invitation mode the previous `QUANTGYM_BETA_EMAIL_ALLOWLIST` is
ignored. Existing accounts are retained and can keep signing in. New accounts,
including previously allowlisted emails without an account, require an invite.
Email registration requires verification even if the old
`QUANTGYM_REQUIRE_EMAIL_VERIFICATION` flag is disabled.

The API initializes `registration_invitations` and `invitation_redemptions` on
startup for SQLite or Postgres. Both are additive tables. Back up the database
before a production deployment. Deploy the API and frontend together, verify
existing-admin access, then generate and test a single invitation.

If reverting to legacy mode with `QUANTGYM_REQUIRE_INVITE_CODE=0`, the original
allowlist behavior applies again. Include all admitted users in that allowlist
before rollback or they will lose access while legacy mode is enabled.

Local test fixtures that exercise legacy registration explicitly set
`QUANTGYM_REQUIRE_INVITE_CODE=0`. Invitation tests run only against temporary,
loopback services and do not send external email. For local invitation testing,
use a seeded administrator fixture rather than disabling production admissions.

## API contract

| Endpoint | Access | Behavior |
| --- | --- | --- |
| `GET /api/auth/config` | Public | Returns `inviteRequired` |
| `POST /api/auth/verification-code` | Public | Requires `inviteCode` for register purpose |
| `POST /api/auth/register` | Public | Requires `inviteCode` and `verificationCode` |
| `POST /api/auth/google` | Public | Requires `inviteCode` when creating a new user |
| `GET /api/admin/invitations` | Admin | Up to 200 invitation metadata records |
| `POST /api/admin/invitations` | Admin | Generate codes; plaintext returned here only |
| `POST /api/admin/invitations/{id}/revoke` | Admin | Disable future redemption |

Creation accepts `count` (1–50), `maxUses` (1–1000), `expiresInDays` (1–365) and an
optional `email`. The API also accepts a label and an explicit `expiresAt`.
Database records contain only the invitation's SHA-256 hash; audit events never
contain full codes. Existing auth rate limiting also covers invalid invite
attempts before validation. Do not place invitation codes in URLs, logs, account
profiles, cloud sync payloads or committed configuration files.

Run `npm run test:invitations` for the invitation client, administration and
backend regression tests. These cover rejection, successful redemption,
concurrency, failed-registration rollback, Google admission and existing users.
With `psycopg` and local PostgreSQL `initdb`/`pg_ctl` available, run
`python3 scripts/test-invitations-api.py --postgres` to repeat the backend suite
against a disposable local PostgreSQL cluster. It never uses the production
database or sends external email.

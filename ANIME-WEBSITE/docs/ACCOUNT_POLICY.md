# Account policy — personal trial

Owner decision, 2026-11-15. This policy supersedes earlier email-verification
requirements in the Phase 3 proposals for this personal trial.

- Use an email address and password for registration/login. No confirmation
  email or mailbox-ownership check is required. Validate email syntax and
  uniqueness, but do not claim that the address belongs to the user.
- Keep Argon2id passwords, server-side sessions, CSRF and user-scoped access.
  Email alone is not a credential and cannot authorize a password reset.
- `email_verified_at` stays null; `emailVerified` remains false. Neither blocks
  login, authenticated activity, favorites or voluntary deletion.
- Do not expose the candidate verify-email endpoint or create verification
  tokens. Keep the existing migration/table for compatibility; it is unused.
- Accounts have no fixed end date. Delete after 168 hours without successful
  login/authenticated API use, measured from creation initially. Voluntary
  deletion requires confirmation and password reauthentication within 5 minutes.
- No paid API or email service is selected or required for registration/login.
- The owner explicitly excluded password recovery. Do not implement reset
  requests, reset-token confirmation, recovery mail or a "forgot password" UI.
  No SMTP service or reset-token lifetime decision is needed for this trial.
  Existing `password_reset_tokens` schema is retained but unused; do not modify
  an already versioned migration or create tokens. Password changes while signed
  in and knowing the current password are separate from recovery.
- A forgotten password cannot be recovered. The account remains subject to the
  seven-day inactivity deletion policy; do not bypass authentication by email.

## Implemented personal-trial defaults

Registration/login/session/favorites API and UI, password change, JSON export
and voluntary deletion are implemented. Following the owner's instruction to
finish the trial, implementation defaults are 30-day authenticated sessions,
one-hour anonymous sessions, passwords of 12 characters minimum/256 UTF-8 bytes
maximum, and 10 authentication requests per IP per 15 minutes. Account routes
also have a 120-request/minute/IP limit. These single-process limits need review
before multi-instance deployment. No paid service or email delivery is required.

The running application performs inactive-account cleanup at startup and every
minute (100 accounts/run), along with expired-session cleanup. No operating-system
service is installed. JSON export includes only account fields and favorite
references, not password hashes, session IDs, signing keys or tokens.

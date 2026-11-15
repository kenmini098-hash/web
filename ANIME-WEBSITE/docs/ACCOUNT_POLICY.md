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
- No paid API or email service is selected or required for basic registration
  and login. No SMTP is required solely for verification. Recovery by email is
  not operational without an approved delivery configuration; do not simulate
  successful mail delivery or return recovery tokens to unauthenticated users.

Remaining implementation: registration/login/session/favorites API and UI,
database configuration and scheduling. Session lifetime, recovery/export and
abuse-control choices remain to be settled; removing email verification does
not mean removing authentication or authorizing paid services.

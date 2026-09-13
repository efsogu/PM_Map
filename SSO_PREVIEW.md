# Portal SSO preview

This branch is a non-production security preview for the Main Service Intelligence Portal integration.

- The deployed build removes the legacy browser-only credential comparisons.
- `/api/auth/consume` accepts a short-lived signed handoff from the portal and sets an HttpOnly session cookie.
- `/api/auth/session` validates the module session.
- `PORTAL_SSO_SECRET` must be configured server-side in Vercel before the handoff can be activated.
- No API token or credential is stored in this repository.

Do not merge to `main` until the portal-side issuer, runtime session checks, role mapping, and end-to-end tests pass.

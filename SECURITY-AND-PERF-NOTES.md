# Pre-deployment review — what changed and why

## 🔴 Do this before anything else

**The live Neon database password and JWT_SECRET were sitting in plaintext in
`wrangler.toml`** (a file that's normally committed to git — it was not in
your `.gitignore`), and the same DB password plus a `SUPER_ADMIN_PASSWORD`
were in `.env`. If this repo has ever been pushed to GitHub/GitLab, or shared
with anyone, **both credentials are compromised and must be rotated now**:

1. In the Neon dashboard, reset the database password (or create a new role)
   and update `DATABASE_URL` everywhere.
2. Generate a new long random `JWT_SECRET` (this instantly invalidates all
   existing tokens, which is fine — it's a one-time forced re-login).
3. Change `SUPER_ADMIN_PASSWORD` to something strong and unique.
4. Set all of these as **Cloudflare Worker secrets**, not `[vars]`:
   ```
   wrangler secret put DATABASE_URL
   wrangler secret put JWT_SECRET
   wrangler secret put SUPER_ADMIN_EMAIL
   wrangler secret put SUPER_ADMIN_PASSWORD
   ```
   `wrangler.toml` no longer contains any of these — see the comments in
   that file. For local dev, copy `.dev.vars.example` to `.dev.vars` (already
   gitignored).
5. Set `ALLOWED_ORIGINS` in `wrangler.toml` to your real frontend domain(s).

This is unrelated to code quality — it's the single highest-impact fix in
this pass.

---

## Security fixes

- **Mass assignment on every admin write route.** `POST`/`PATCH` handlers
  used to spread the raw request body straight into `db.insert(...)` /
  `db.update(...).set(body)`. A caller could send `{"id": "...", "featured": true}`
  or worse and have it applied verbatim. Every entity route now runs the body
  through `pickFields()` against a whitelist in `src/lib/allowedFields.ts`
  before it ever reaches the database.
- **Error messages no longer leak internals.** Routes used to return
  `{ error: String(error) }` on failure, which can expose stack traces,
  file paths, or raw driver errors. There's now a single centralized
  `app.onError` handler in `app.ts` that logs full detail server-side and
  returns a generic message to the client. It also turns Postgres unique/FK
  constraint violations into proper `409` responses instead of `500`s.
- **CORS was wide open (`origin: "*"`).** Now restricted via an
  `ALLOWED_ORIGINS` env var; falls back to `*` only if you don't set it (so
  nothing breaks silently), but you should set it for production.
- **Added `secureHeaders()`** (Hono's built-in middleware) for standard
  protections (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- **Basic login rate limiting** on `POST /auth/login` (10 attempts / 15 min
  per IP). Note: this is an in-memory, per-isolate limiter — a reasonable
  extra layer, but for real protection at scale also add a Cloudflare Rate
  Limiting Rule in front of that endpoint.
- **Input validation with zod** on the security-sensitive endpoints: login,
  create user, change password, create/update role, assign permission.
  Passwords now require a minimum length (8 chars) on creation and change.
- **User creation now checks for duplicate email up front** and returns a
  clean `409` instead of a raw DB error.
- **Malformed JSON bodies** now return a clean `400` instead of a `500`
  (also handled centrally in `app.onError`).

## Performance fixes

- **N+1 query in permission loading** (`getUserPermissions` in
  `routes/auth.ts`, called on every login and token refresh): it used to run
  one query per role a user had. Replaced with a single joined query.
- **`authMiddleware` was fetching every column** of the admin user on every
  authenticated request just to check `isActive`. Trimmed to select only
  `id, isActive`.
- **Unbounded list endpoints.** `GET /collections`, `/products`, `/events`,
  `/upcoming-events` (and their admin equivalents) returned every row with
  no limit — fine at 20 rows, not fine at 20,000. Added `?limit=&offset=`
  pagination (default 50, max 100 per page) via `src/lib/pagination.ts`.
- **Missing indexes on foreign keys.** Drizzle/Postgres doesn't auto-index
  FK columns. Added indexes on `products.collection_id`,
  `events.category_id`, `upcoming_events.category_id`,
  `page_sections.page_id`, `admin_user_roles.(user_id, role_id)`,
  `role_permissions.role_id`, `user_permissions.user_id`,
  `refresh_tokens.user_id`, plus a couple of `featured`/`status`-style
  filter columns. **Run `npm run db:push` (or `db:generate` + migrate)
  against your database to apply these.**
- **Cache-Control headers** added to public, read-only customer endpoints
  (30–60s) so repeated reads of largely-static content (brand info, nav,
  pages) don't have to hit Postgres every time.

## Other things worth knowing

- `package.json`'s `dev` script was `tsx src/index.ts`, but `src/index.ts`
  just exports a Hono `app` — there's no Node HTTP server anywhere, so that
  script never actually served anything. Given `wrangler.toml` is present,
  this project targets Cloudflare Workers, so `dev` now runs `wrangler dev`
  (and there's now a `deploy` script too).
- `zod` was already a dependency but unused anywhere in the original code —
  it's now doing real work on the routes listed above.
- Nothing here changes your database schema's actual data or column names —
  only adds indexes — so this is safe to apply to your existing Neon
  database without a destructive migration.

## Still worth considering (not done here, out of scope for a drop-in fix)

- Access tokens are valid for 24h with no revocation list — fine for most
  apps, but if you ever need to force-logout a compromised admin
  immediately, you'd need a token blocklist or shorter-lived access tokens
  with more frequent refresh.
- No automated tests. `test.sh` is a manual smoke-test script, not a test
  suite.

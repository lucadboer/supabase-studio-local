# supabase-studio-local

Run **Supabase Studio** locally against **any Postgres container** on your Docker host,
without booting the full self-hosted Supabase stack.

Point it at a running container (e.g. `postgres`, `pgvector`, `timescale`), type the
password if the database asks for one, and get the Studio experience — Table Editor,
SQL Editor, schemas, roles, RLS policies, extensions, indexes, etc.

![screenshot](.github/screenshot.png)

## Why

The official Supabase self-hosted Docker setup assumes you want to run the whole
Supabase platform (auth, storage, realtime, edge functions, postgrest, kong…). If all
you want is the Studio UI to browse and query an existing Postgres container in your
Docker, that's overkill.

This project strips it down to just the Studio + `postgres-meta` sidecar, plus a small
connection manager on top.

## What it adds on top of upstream Studio

Extracted from [`supabase/supabase`](https://github.com/supabase/supabase)'s
`apps/studio` (Apache-2.0). Extra features:

- **Docker container discovery** — `/api/local/discover` lists Postgres containers on
  your host by inspecting the Docker socket.
- **Connection manager page** (`/local-connect`) — pick a container, type the password,
  optionally **Test & inspect** to see the database size / schema count / table count /
  Postgres version before committing to the connection.
- **Dialog per container** — shows host, port, database, user, plus two ready-to-copy
  connection strings (one for the host, one for inside another Docker container).
- **Switcher in the Studio header** — next to the **Connect** button. Shows the active
  container + port and lets you switch databases or disconnect without leaving the UI.
- **Signed HMAC cookie** stores the selection server-side. Every call to the Studio
  `/api/platform/pg-meta/*` routes is transparently annotated with
  `x-connection-encrypted` so `postgres-meta` talks to the DB you picked.

## Requirements

- Docker Desktop (or another Docker-compatible daemon with a Unix socket)
- A Postgres container running on your host, with port `5432` exposed
- About 4 GB of free RAM for the `studio` container

## Quick start

```bash
git clone https://github.com/lucadboer/supabase-studio-local.git
cd supabase-studio-local
docker compose up -d
```

Open [http://localhost:8000](http://localhost:8000).

- You'll land on `/local-connect` with the list of Postgres containers detected on
  your Docker host.
- Click one → a dialog pops up. Review host / port / database / user. Paste the
  password (or leave it empty if the container uses `trust` auth).
- Click **Test & inspect** to validate and preview size/schemas/tables.
- Click **Connect** to enter the Studio.

To switch databases later, use the switcher in the top-left header (next to the
**Connect** button) or navigate to `/local-connect` at any time.

## How it finds your Postgres containers

`/api/local/discover` calls the Docker API (via the Unix socket mounted into the
container) and returns every container whose image name contains `postgres`,
`pgvector`, `timescale`, or `supabase/postgres`, **and** which exposes port
`5432/tcp`. It also respects an opt-in label:

```bash
docker run -l studio.local.postgres=true ...
```

For each match it reads the container's env vars to pre-fill the default user
(`POSTGRES_USER`) and database (`POSTGRES_DB`).

## Configuration

The `docker-compose.yml` ships with sane defaults but you should override the secrets
before running this anywhere but your own laptop. Create a `.env` file next to
`docker-compose.yml`:

```env
PG_META_CRYPTO_KEY=replace-me-with-a-32+-char-random-string
STUDIO_LOCAL_COOKIE_SECRET=replace-me-with-another-random-string
```

| Env var                      | Default                                      | What it does                                                                                                    |
| ---------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PG_META_CRYPTO_KEY`         | `change-me-change-me-change-me-32chars`      | AES key (≥32 chars) shared between Studio and `postgres-meta` to encrypt the connection string on every request |
| `STUDIO_LOCAL_COOKIE_SECRET` | `cookie-secret-change-me-change-me`          | HMAC secret for the `studio-local-db` cookie that stores the current selection                                  |
| `DOCKER_POSTGRES_HOST`       | `host.docker.internal`                       | Hostname Studio/pg-meta use to reach Postgres containers that publish ports on the host                         |
| `DOCKER_SOCKET`              | `/var/run/docker.sock`                       | Path to the Docker socket inside the container                                                                  |

The container mounts `/var/run/docker.sock` **read-only**.

## Architecture

```
Browser ──► Studio (Next.js, :8000) ──► postgres-meta (sidecar, :8080) ──► your Postgres container
                     │
                     └── /api/local/discover          — reads /var/run/docker.sock
                     └── /api/local/connect           — pg.Client auth check, sets cookie
                     └── /api/local/session           — reads cookie, returns current selection
                     └── /api/local/...               — middleware injects x-connection-encrypted
```

The Studio container runs the Next.js server and speaks to the `postgres-meta` sidecar
over the internal Docker network. `postgres-meta` accepts a per-request
`x-connection-encrypted` header that overrides its default `PG_META_DB_URL` — that's
how we target arbitrary Postgres instances without restarting anything.

## Limitations

- Features that depend on other Supabase services (Auth, Storage, Realtime, Edge
  Functions) **do not work** — only the Postgres-level features do (Table Editor, SQL
  Editor, schemas, roles, RLS, extensions, indexes, etc.).
- Non-Supabase databases may show empty results on screens that expect Supabase-specific
  schemas/extensions (`auth`, `storage`, `graphql_public`, `pgsodium`, …).

## Security

- The Studio container mounts `/var/run/docker.sock` read-only. Anyone who can reach
  your Studio can list and inspect containers on the host — **do not expose port
  `8000` outside your machine**.
- Database passwords are held in an `HttpOnly`, `SameSite=Lax`, HMAC-signed cookie.
  They're AES-encrypted before being sent to `postgres-meta` via the
  `x-connection-encrypted` header.
- This project is intended for local development. Don't deploy it as-is.

## Development

The repo is a trimmed-down copy of the upstream Supabase monorepo: `apps/studio` plus
the workspace packages it depends on (`ui`, `ui-patterns`, `common`, `pg-meta`, etc.).

```bash
pnpm install
pnpm --filter studio build
docker compose up -d --build
```

Files that contain all the new behaviour:

```
apps/studio/pages/api/local/discover.ts        # Docker socket scan
apps/studio/pages/api/local/connect.ts         # auth check + cookie write
apps/studio/pages/api/local/session.ts         # current selection readback
apps/studio/pages/local-connect.tsx            # connection manager page + dialog
apps/studio/components/interfaces/LocalSwitcher/LocalSwitcher.tsx  # header switcher
apps/studio/lib/local-connection.ts            # cookie + encryption helpers
apps/studio/lib/local-connection-constants.ts  # edge-runtime-safe cookie name
apps/studio/lib/api/apiHelpers.ts              # injects x-connection-encrypted
apps/studio/lib/api/self-hosted/util.ts        # getConnectionString reads cookie
apps/studio/proxy.ts                           # redirects to /local-connect when needed
```

## License

Apache-2.0, same as the upstream Supabase monorepo. See [LICENSE](./LICENSE).

This project is a derivative work and is **not affiliated with or endorsed by
Supabase Inc.**

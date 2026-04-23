# supabase-studio-local

**Supabase Studio for any Postgres container on your Docker host.** Zero
configuration — clone, run, open.

No env vars. No `.env` file. No Supabase stack. Just the Studio UI plugged into
whatever Postgres containers you already have.

## Run it

```bash
git clone https://github.com/lucadboer/supabase-studio-local.git
cd supabase-studio-local
docker compose up -d
```

Open **http://localhost:8000**.

## Use it

1. You land on the database picker. Every Postgres container running on your
   Docker host is listed.
2. Click one. A dialog shows its host, port, database, user, and connection
   strings you can copy.
3. Type the password (leave empty if the DB doesn't require one). Click
   **Connect**.
4. You're in Studio — Table Editor, SQL Editor, schemas, RLS policies, indexes,
   extensions, everything.

To switch databases later, use the switcher in the top-left header (next to the
**Connect** button) or go back to [/local-connect](http://localhost:8000/local-connect).

## Requirements

- Docker Desktop (or any Docker daemon with a Unix socket)
- A running Postgres container exposing port `5432`

That's it.

## What works

- ✅ Table Editor
- ✅ SQL Editor
- ✅ Database (schemas, tables, columns, roles, policies, indexes, functions,
  triggers, extensions, publications…)
- ❌ Auth, Storage, Realtime, Edge Functions (those are separate Supabase
  services, not included here)

Non-Supabase databases work fine for everything in the ✅ list.

## Notes

- The Studio container mounts `/var/run/docker.sock` read-only so it can list
  your Postgres containers. **Don't expose port `8000` outside your machine.**
- Passwords are kept in an `HttpOnly`, HMAC-signed cookie and AES-encrypted when
  forwarded to the `postgres-meta` sidecar.
- This is for local development. Don't deploy it as-is.

## Credits & license

Apache-2.0. This is a trimmed-down fork of
[`supabase/supabase`](https://github.com/supabase/supabase)'s `apps/studio`,
with added Docker discovery and a local connection manager on top.

Not affiliated with or endorsed by Supabase Inc.

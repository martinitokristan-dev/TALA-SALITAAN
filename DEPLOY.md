# Deploying Tala-Salitaan

One repo, two hosts:

| Part | Host | Folder |
|---|---|---|
| API (Laravel) | Render, Docker web service | `backend/` |
| Game + teacher portal (React) | Cloudflare Pages | `frontend/` |
| Database | TiDB Cloud (MySQL compatible) | - |
| Pictures and audio | Cloudinary | - |

Never put passwords or keys in the code or in a chat. They go only into the hosts' environment settings.

## 1. TiDB Cloud

1. Create a Serverless cluster, then a database, e.g. `tala_salitaan`.
2. **Connect** -> "General" shows host, port `4000`, user and password (generate one).

## 2. Cloudinary

Dashboard -> **API Keys**: copy the "API environment variable", it looks like
`cloudinary://<api key>:<api secret>@<cloud name>`.

## 3. Render (backend)

New -> **Web Service** -> this repo.

- Language: **Docker**
- Root Directory: `backend`
- Health check path: `/up`

Environment variables:

| Key | Value |
|---|---|
| `APP_NAME` | `Tala-Salitaan` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | run `php artisan key:generate --show` in `backend/` on your computer, paste the result (starts with `base64:`) |
| `APP_URL` | `https://<your-service>.onrender.com` |
| `LOG_CHANNEL` | `stderr` |
| `LOG_LEVEL` | `warning` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | TiDB host |
| `DB_PORT` | `4000` |
| `DB_DATABASE` | `tala_salitaan` |
| `DB_USERNAME` | TiDB user (looks like `xxxx.root`) |
| `DB_PASSWORD` | TiDB password |
| `MYSQL_ATTR_SSL_CA` | `/etc/ssl/certs/ca-certificates.crt` (TiDB requires TLS) |
| `FRONTEND_ORIGINS` | `https://<your-project>.pages.dev` (comma-separated if more, e.g. a custom domain) |
| `CACHE_STORE` | `file` |
| `SESSION_DRIVER` | `file` |
| `QUEUE_CONNECTION` | `sync` |
| `CLOUDINARY_URL` | the `cloudinary://...` value |

Every deploy runs the database migrations by itself (`docker/start.sh`).

### First teacher account

Render's free plan has no shell, so create it from your computer against TiDB once:
put the same `DB_*` and `MYSQL_ATTR_SSL_CA` values in `backend/.env` (for Windows use the
CA file path TiDB's Connect dialog shows), then run `php artisan teacher:create teacher@school.ph`.
Switch `backend/.env` back to your local database afterwards.

## 4. Cloudflare Pages (frontend)

Workers & Pages -> Create -> Pages -> connect this repo.

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

Environment variables (Production):

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://<your-service>.onrender.com/api` |
| `NODE_VERSION` | `22` |

Pages serves `index.html` for unknown paths, so refreshing `/mapa` or `/teacher/salita` works.

## 5. After the first deploy

- Put the Pages address into Render's `FRONTEND_ORIGINS` (exact, with `https://`, no trailing `/`), then redeploy Render.
- Point the Better Stack monitor at `https://<your-service>.onrender.com/up` so the free service does not sleep.
- Log in to the portal, add a section and the words.

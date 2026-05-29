# InnocenZ Prototype

Combined **React app** (`your-app-idea-clicked`) + **MVP v3** flows (static prototype in `prototype/`).

## Roles

| Portal | Route | Source |
|--------|-------|--------|
| PR Personnel | `/host` | React app |
| PR Agency | `/agency` | MVP v3 + React |
| Outlet | `/outlet` | React app |
| Admin | `/admin` | Separate portal (linked from welcome) |

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
pnpm run build          # local preview build
pnpm run build:pages    # GitHub Pages paths (/InnocenZ-proto/)
pnpm run deploy         # same as build:pages
```

## Publish (GitHub Pages)

1. Run `pnpm run deploy` to verify the production build locally.
2. Commit and **push to `main`** (or run the workflow manually under Actions → *Deploy to GitHub Pages*).

CI uses pnpm, `build:pages`, and uploads `dist/client`.

Site URL: `https://<your-username>.github.io/InnocenZ-proto/`

## Legacy static prototype

The original single-file HTML prototype lives in [`prototype/`](prototype/) (open `prototype/index.html` locally).

## Deploy

GitHub Actions builds the Vite app and deploys to GitHub Pages on push to `main`.

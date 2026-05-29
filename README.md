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
npm run build
```

## Legacy static prototype

The original single-file HTML prototype lives in [`prototype/`](prototype/) (open `prototype/index.html` locally).

## Deploy

GitHub Actions builds the Vite app and deploys to GitHub Pages on push to `main`.

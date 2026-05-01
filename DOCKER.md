# Docker guide — react-auth

This project ships a **multi-stage** Docker image: Node builds the Vite app (`npm run build` → `dist/`), then **nginx** serves the static files on **port 80**.

Prerequisites on your machine:

- [Docker Engine](https://docs.docker.com/engine/install/) (Docker Desktop on macOS/Windows is fine)
- Optional: account on a registry (Docker Hub, GitHub Container Registry, etc.) to push/pull images

Related files:

- `Dockerfile` — build and runtime definition
- `.dockerignore` — excludes `node_modules` and local env files from the build context

---

## Build the image locally

From the repository root (where `Dockerfile` lives):

```bash
docker build -t react-auth:local .
```

Use any tag you prefer instead of `react-auth:local` (e.g. `react-auth:dev`, `react-auth:1.0.0`).

---

## Run the container locally

```bash
docker run --rm -p 8080:80 react-auth:local
```

Then open **http://localhost:8080** (host `8080` → container `80`).

Stop with `Ctrl+C`, or in another terminal:

```bash
docker stop <container_id>
```

---

## Environment variables and secrets

`.env`, `.env.local`, and `.env.production` are **not** copied into the image (see `.dockerignore`).  
For production builds that need runtime configuration, teams typically use:

- build-time `ARG`/`ENV` in the Dockerfile (only if values are safe to bake in), or  
- injecting config at runtime (e.g. config JSON mounted as a volume, or a reverse proxy / API).

Coordinate with your team’s deployment pattern before relying on env-specific behavior inside the static bundle.

---

## Tagging for a registry

Replace placeholders with your registry and image name.

**Docker Hub example** (`docker.io` is default):

```bash
docker tag react-auth:local YOUR_DOCKERHUB_USER/react-auth:latest
docker tag react-auth:local YOUR_DOCKERHUB_USER/react-auth:1.0.0
```

**GitHub Container Registry example**:

```bash
docker tag react-auth:local ghcr.io/YOUR_ORG/react-auth:latest
```

---

## Log in to a registry

```bash
docker login
```

```bash
docker login ghcr.io
```

Follow prompts for username and password/token.

---

## Push an image

After login and tagging:

```bash
docker push YOUR_DOCKERHUB_USER/react-auth:latest
```

```bash
docker push ghcr.io/YOUR_ORG/react-auth:latest
```

---

## Pull an image

```bash
docker pull YOUR_DOCKERHUB_USER/react-auth:latest
docker run --rm -p 8080:80 YOUR_DOCKERHUB_USER/react-auth:latest
```

---

## Useful commands

| Goal                         | Command                                      |
| ---------------------------- | -------------------------------------------- |
| List images                  | `docker images`                              |
| List running containers      | `docker ps`                                  |
| Remove an image              | `docker rmi react-auth:local`                |
| Inspect image layers/history | `docker history react-auth:local`            |
| Shell into running container | `docker exec -it <container_id> sh`          |

---

## CI/CD notes

- Run `docker build` from the repo root so `COPY . .` and `package.json` paths match the Dockerfile.
- Prefer immutable tags (Git SHA or semver) for deployable artifacts, not only `latest`.
- Ensure CI has registry credentials (e.g. `docker login` with a scoped token) before `docker push`.

---

## Optional: Apache variant

The `Dockerfile` includes commented lines for an Apache-based production stage. To use that instead of nginx, adjust stages per those comments and expose the port Apache uses (as noted in the file).

---

## Troubleshooting

- **Build fails on `npm run build`**: Fix TypeScript/Vite errors locally with `npm run build` first.
- **Blank page or wrong API URL**: Static apps often need the correct `base` or API URLs at build time; verify Vite env docs and your deployment URL.
- **Port already in use**: Change the host port, e.g. `-p 3000:80`.

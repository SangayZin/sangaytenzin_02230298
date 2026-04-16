Part B — Automated Deployment using Render Blueprint

**Overview**: This section documents the Render Blueprint configuration used to automate deployment of the multi-service todo application (frontend + backend). The blueprint enables Render to pull the GitHub repository, build Docker images, and automatically deploy services on new commits.

**Repository Structure**
- **Project root**: `todo-app` (repository)
- **Frontend**: `frontend/` — contains `Dockerfile`, build files and production environment variables
- **Backend**: `backend/` — contains `Dockerfile` and runtime environment configuration
- **Blueprint**: `render.yaml` — multi-service deployment manifest for Render

**render.yaml Configuration**
The blueprint defines two web services (backend and frontend) using Docker:

- **Backend (be-todo)**
	- type: `web`
	- env: `docker`
	- plan: `free`
	- dockerfilePath: `./backend/Dockerfile`
	- autoDeploy: `true`
	- envVars:
		- `PORT` = `5000`
		- `DB_PATH` = `/tmp/todos.db`

- **Frontend (fe-todo)**
	- type: `web`
	- env: `docker`
	- plan: `free`
	- dockerfilePath: `./frontend/Dockerfile`
	- autoDeploy: `true`
	- envVars:
		- `PORT` = `3000`
		- `VITE_API_URL` = `https://be-todo-lwar.onrender.com` (used at build time)
		- `REACT_APP_API_URL` = `https://fe-todo-fd57.onrender.com`

**Key Configuration Details**
- **type: web** — indicates each entry is a web service.
- **env: docker** — instructs Render to build and run the service from a Dockerfile.
- **autoDeploy: true** — Render will redeploy the service automatically when new commits are pushed to the linked GitHub repo.
- **dockerfilePath** — path to the service Dockerfile used for building images.
- **envVars** — variables injected at build time (frontend) or runtime (backend).

**Backend Service (be-todo)**
- Listens on port `5000`.
- Uses temporary SQLite storage at `/tmp/todos.db` (ephemeral; data lost on restarts unless persisted elsewhere).

**Frontend Service (fe-todo)**
- Listens on port `3000`.
- `VITE_API_URL` must reference the backend service URL so the frontend fetches API data from the deployed backend. This variable is typically required during image build for Vite-based apps.

**Steps to Deploy Using Render Blueprint**
1. Connect GitHub repository to Render: Log in to Render Dashboard → New + → Blueprint → Connect repository and authorize GitHub.
2. Create Blueprint: Select repository containing `render.yaml`.
3. Configure Blueprint: Render auto-detects `render.yaml`; review services and environment variables; update API URLs if needed.
4. Deploy: Click `Deploy`. Render will clone the repo, build Docker images for each service, and deploy the services.
5. Verify: After deployment, Render provides service URLs (example placeholders used here):
	 - Backend: `https://be-todo-lwar.onrender.com`
	 - Frontend: `https://fe-todo-fd57.onrender.com`

**Automatic Deployment on Git Push**
- With `autoDeploy: true`, pushing a commit to the linked GitHub branch triggers Render to rebuild and redeploy automatically. Example developer commands:

```
git add .
git commit -m "Update application"
git push origin main
```

Render process:
- Detects the new commit via webhook
- Clones repository
- Builds Docker images using the service Dockerfiles
- Deploys updated services

**Continuous Integration and Continuous Deployment (CI/CD)**
- **Flow**: Developer commit → push to GitHub → Render webhook triggers → build → deploy → application updated.
- **Benefits**: Automation, faster feedback, consistent builds, and simplified multi-service management.

**Troubleshooting Common Issues**
- **Frontend cannot connect to backend**: Ensure `VITE_API_URL` in `render.yaml` points to the correct backend URL. If backend URL is dynamic, update blueprint or use Render service discovery patterns.
- **Build fails with npm errors**: Verify `package.json` and `package-lock.json` are consistent, check Node version compatibility in Dockerfiles, and ensure dependencies are installable during build.
- **Environment variables not loading**: For Vite/CRA-style frontends, env vars required at build time must be present during image build. Backend env vars are applied at runtime—restart service after changing runtime vars.

**Challenges Faced**
- Docker build configuration and platform mismatches caused build failures during initial attempts.
- Frontend-to-backend environment variable propagation: Vite requires API URL at build time, which required passing `VITE_API_URL` through the blueprint.
- Ensuring correct and stable backend URL for the frontend when services are redeployed.

**Conclusion**
- The Render Blueprint (`render.yaml`) provides a straightforward way to declare and automate deployment of multi-service applications.
- With Docker-based services and `autoDeploy: true`, updates flow from Git commits to deployed services with minimal manual intervention.
- Key learnings: containerization with Docker, environment-variable handling across build/runtime, and how Render automates CI/CD for simple service topologies.

**Next steps / Recommendations**
- Persist backend data using Render persistent disks or an external managed DB instead of `/tmp`.
- Add CI checks (linting, tests) to the GitHub workflow to catch build-time issues earlier.
- Use Render's secret management for sensitive env vars and review service health checks for better reliability.

----
Report generated for Part B — Render Blueprint automated deployment.


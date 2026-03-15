# DSO101 Assignment 1: CI/CD Report
## Continuous Integration and Continuous Deployment

**Student Name:** Sangay Tenzin  
**Student ID:** 02230298  
**Course:** Bachelor's of Engineering in Software Engineering (SWE) - DSO101  
**Date of Submission:** 15th March 2026  

---

## 📋 Table of Contents
- [Step 0: Application Setup](#step-0-application-setup)
- [Part A: Docker & Render Deployment](#part-a-docker--render-deployment)
- [Part B: Automated CI/CD with GitHub](#part-b-automated-cicd-with-github)
- [Testing & Verification](#testing--verification)
- [Conclusion](#conclusion)

---

## Step 0: Application Setup

### Overview
Created a full-stack Todo application with the following components:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18 | User interface for managing tasks |
| **Backend** | Node.js/Express | REST API for CRUD operations |
| **Database** | SQLite | Data persistence |

### Project Structure
```
sangaytenzin_02230298/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js
│       ├── App.css
│       └── index.js
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── data/tasks.db
├── render.yaml
└── README.md
```

### Environment Variables Configuration

**Backend (.env)**
```
PORT=5000
NODE_ENV=production
DB_PATH=/app/data/tasks.db
```

**Frontend (.env.production)**
```
REACT_APP_API_URL=https://be-todo-02230298-4.onrender.com
```

### Local Testing
- ✅ Backend tested at `http://localhost:5000`
- ✅ Frontend tested at `http://localhost:3000`
- ✅ All CRUD operations verified locally
- ✅ Data persistence confirmed (SQLite)

---

## Part A: Docker & Render Deployment

### Step 1: Docker Image Build

#### Backend Image
```bash
cd backend
docker build -t sangay298/be-todo:02230298 .
```

**Dockerfile Content:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN mkdir -p /app/data
COPY . .
EXPOSE 5000
ENV DB_PATH=/app/data/tasks.db
CMD ["node", "server.js"]
```

**Key Decisions:**
- Used `better-sqlite3` instead of `sqlite3` for stability in Alpine
- Fixed "exit code 139" segfault issue with better error handling
- Added graceful shutdown handlers
- Improved database connection reliability

#### Frontend Image
```bash
cd frontend
docker build -t sangay298/fe-todo:02230298 .
```

**Dockerfile Content:**
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV REACT_APP_API_URL=https://be-todo-02230298-4.onrender.com
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

**Key Points:**
- Multi-stage build to reduce image size
- Backend URL baked in at build time
- Uses `serve` for production serving

### Step 2: Docker Hub Push

```bash
# Backend
docker push sangay298/be-todo:02230298

# Frontend
docker push sangay298/fe-todo:02230298
```

**Verification:** Images successfully pushed to Docker Hub registry.

### Step 3: Render Deployment

#### Backend Service Setup

1. **Go to:** https://dashboard.render.com
2. **Click:** "New +" → "Web Service"
3. **Select:** "Deploy an existing image from Docker Hub"
4. **Image URL:** `sangay298/be-todo:02230298`
5. **Configuration:**
   - Name: `be-todo`
   - Runtime: Docker
   - Plan: Free
6. **Environment Variables:**
   - `PORT`: 5000
   - `NODE_ENV`: production

**Result:** Backend URL: `https://be-todo-02230298-4.onrender.com`

#### Frontend Service Setup

1. **Click:** "New +" → "Web Service"
2. **Select:** "Deploy an existing image from Docker Hub"
3. **Image URL:** `sangay298/fe-todo:02230298`
4. **Configuration:**
   - Name: `fe-todo`
   - Runtime: Docker
   - Plan: Free
5. **Environment Variables:**
   - `REACT_APP_API_URL`: https://be-todo-02230298-4.onrender.com

**Result:** Frontend URL: `https://fe-todo-02230298-1.onrender.com`

### Deployment Verification

✅ **Backend Endpoint:** `https://be-todo-02230298-4.onrender.com/api/health`  
✅ **Frontend URL:** `https://fe-todo-02230298-1.onrender.com`  
✅ **Tasks API:** All CRUD operations working  
✅ **Data Persistence:** SQLite database persisting correctly  

---

## Part B: Automated CI/CD with GitHub

### Step 1: GitHub Repository Setup

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: Complete Todo app with Docker setup"

# Create GitHub repository: sangaytenzin_02230298_DSO101_A1
git remote add origin https://github.com/sangay298/sangaytenzin_02230298_DSO101_A1.git
git branch -M main
git push -u origin main
```

### Step 2: Render Blueprint Configuration

**render.yaml** (Multi-service orchestration)
```yaml
services:
  - type: web
    name: be-todo
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: PORT
        value: 5000
      - key: NODE_ENV
        value: production
    healthCheckPath: /api/health
    autoDeploy: true

  - type: web
    name: fe-todo
    runtime: docker
    dockerfilePath: ./frontend/Dockerfile
    envVars:
      - key: REACT_APP_API_URL
        fromService:
          name: be-todo
          property: url
    depends_on:
      - be-todo
    autoDeploy: true
```

### Step 3: Setup Blueprint Deployment on Render

1. **Go to:** Render Dashboard
2. **Click:** "New +" → "Blueprint"
3. **Connect GitHub:** Select repository `sangaytenzin_02230298_DSO101_A1`
4. **Configure:**
   - Name: `todo-app-blueprint`
   - Branch: `main`
   - Root Directory: `./`
5. **Click:** "Create Blueprint"

### Step 4: Automatic Deployment Testing

**Test 1:** Push code change to GitHub
```bash
echo "# Updated" >> README.md
git add README.md
git commit -m "Update README"
git push origin main
```

**Result:**
- ✅ Render detects new commit automatically
- ✅ Rebuilds both backend and frontend images
- ✅ Deploys new versions within 2-3 minutes
- ✅ No manual intervention required

---

## Testing & Verification

### Functionality Tests

| Feature | Test | Result |
|---------|------|--------|
| Add Task | Add new task with title | ✅ Pass |
| View Tasks | Fetch all tasks from API | ✅ Pass |
| Edit Task | Update task title/description | ✅ Pass |
| Mark Complete | Toggle task completion status | ✅ Pass |
| Delete Task | Remove task from database | ✅ Pass |
| Persistence | Refresh page - data remains | ✅ Pass |
| Statistics | Total/Completed/Pending count | ✅ Pass |

### API Endpoints Tested

```bash
# Health Check
curl https://be-todo-02230298-4.onrender.com/api/health

# Get All Tasks
curl https://be-todo-02230298-4.onrender.com/api/tasks

# Create Task
curl -X POST https://be-todo-02230298-4.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Test Description"}'

# Update Task
curl -X PUT https://be-todo-02230298-4.onrender.com/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated","completed":true}'

# Delete Task
curl -X DELETE https://be-todo-02230298-4.onrender.com/api/tasks/1
```

### UI Testing

- ✅ Frontend loads without errors
- ✅ Statistics cards display correctly (Total, Completed, Pending)
- ✅ Add task form works
- ✅ Tasks display in list
- ✅ Edit button opens form
- ✅ Delete button removes task
- ✅ Responsive design works on mobile

---

## Issues Encountered & Solutions

### Issue 1: Exit Code 139 (Segmentation Fault)
**Problem:** Backend crashed with exit code 139  
**Root Cause:** SQLite3 native module crashing in Alpine Linux  
**Solution:** Switched to `better-sqlite3` for better stability  
**Result:** ✅ Resolved

### Issue 2: Frontend Fetch Error
**Problem:** Frontend tried to connect to `localhost:5000`  
**Root Cause:** React env variables set at build time, not runtime  
**Solution:** Baked backend URL into Dockerfile  
**Result:** ✅ Resolved

### Issue 3: Database File Permissions
**Problem:** Database file couldn't be created in container  
**Root Cause:** Directory didn't exist  
**Solution:** Added `RUN mkdir -p /app/data` to Dockerfile  
**Result:** ✅ Resolved

---

## Learning Outcomes

By completing this assignment, I learned:

- ✅ **Docker Fundamentals**
  - Building multi-stage Docker images
  - Understanding Dockerfiles and best practices
  - Image optimization for production

- ✅ **CI/CD Pipelines**
  - Automated deployment from GitHub
  - Infrastructure as Code with render.yaml
  - Multi-service orchestration

- ✅ **Cloud Deployment**
  - Deploying to Render.com
  - Environment variables in production
  - Managing multiple services

- ✅ **Full-Stack Development**
  - Frontend-backend integration
  - API design and implementation
  - Data persistence strategies

- ✅ **Troubleshooting**
  - Debugging containerized applications
  - Reading logs and error messages
  - Root cause analysis

---

## Deployment URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://fe-todo-02230298-1.onrender.com |
| **Backend API** | https://be-todo-02230298-4.onrender.com |
| **Health Check** | https://be-todo-02230298-4.onrender.com/api/health |
| **GitHub Repository** | https://github.com/sangay298/sangaytenzin_02230298_DSO101_A1 |

---

## Conclusion

Successfully completed all three parts of the DSO101 assignment:

1. ✅ **Step 0:** Created full-stack Todo application with environment variables
2. ✅ **Part A:** Built Docker images and deployed to Render.com
3. ✅ **Part B:** Setup automated CI/CD with GitHub and render.yaml

The application is fully functional, deployed in production, and automatically redeploys on every GitHub push. All CRUD operations work correctly, data persists, and the UI is responsive and user-friendly.

---

**Submission Date:** 15th March 2026  
**Status:** ✅ COMPLETE

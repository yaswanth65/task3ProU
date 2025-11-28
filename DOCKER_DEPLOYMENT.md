# TaskFlow Docker Deployment Guide

## Quick Start - Deploy Everything at Once

### Option 1: Using Batch File (Windows)

```batch
cd C:\temporary projects\New folder\taskflow
.\deploy.bat
```

### Option 2: Using Bash Script (Linux/Mac)

```bash
cd "C:\temporary projects\New folder\taskflow"
bash deploy.sh
```

### Option 3: Manual Docker Compose

```bash
cd "C:\temporary projects\New folder\taskflow"
docker-compose build
docker-compose up -d
```

---

## Prerequisites Check

### Windows

- [ ] Docker Desktop installed and running
- [ ] Docker Compose installed (included with Docker Desktop)
- [ ] WSL 2 or Hyper-V enabled
- [ ] Ports 80, 5000, and 27017 available

### Linux/Mac

- [ ] Docker Engine installed
- [ ] Docker Compose installed
- [ ] Ports 80, 5000, and 27017 available
- [ ] Sufficient disk space (min 2GB)

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│          Docker Host Machine                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │      Docker Network: taskflow-network    │  │
│  │                                          │  │
│  │  ┌───────────────┐  ┌───────────────┐  │  │
│  │  │   Frontend    │  │   Backend     │  │  │
│  │  │  Container    │  │  Container    │  │  │
│  │  │               │  │               │  │  │
│  │  │  Port: 80     │  │  Port: 5000   │  │  │
│  │  └───────┬───────┘  └───────┬───────┘  │  │
│  │          │                  │          │  │
│  │          └──────────────────┼──────────┤  │
│  │                             │          │  │
│  │                    ┌────────▼────────┐ │  │
│  │                    │   MongoDB       │ │  │
│  │                    │   Container     │ │  │
│  │                    │   Port: 27017   │ │  │
│  │                    └─────────────────┘ │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                               │
└─────────────────────────────────────────────┘

External Access:
- Frontend: http://localhost (80)
- Backend: http://localhost:5000 (5000)
- Database: localhost:27017 (27017)
```

---

## Service Details

### MongoDB Container

- **Image**: mongo:7
- **Container Name**: taskflow-mongodb
- **Port**: 27017
- **Credentials**:
  - Username: admin (from .env)
  - Password: password123 (from .env)
  - Database: taskflow
- **Volume**: mongodb_data (persistent data)

### Backend Container

- **Image**: Built from ./backend/Dockerfile
- **Container Name**: taskflow-backend
- **Port**: 5000
- **Node Version**: 20-Alpine (lightweight)
- **Build Process**:
  - Stage 1: Compile TypeScript
  - Stage 2: Run production version
- **Volume**: backend_uploads (for file uploads)

### Frontend Container

- **Image**: Built from ./frontend/Dockerfile
- **Container Name**: taskflow-frontend
- **Port**: 80
- **Web Server**: Nginx (Alpine)
- **Build Process**:
  - Stage 1: Build React app with Vite
  - Stage 2: Serve with Nginx

---

## Deployment Steps

### Step 1: Verify Prerequisites

```bash
# Check Docker installation
docker --version
# Expected: Docker version 20.10+

# Check Docker Compose
docker-compose --version
# Expected: Docker Compose version 1.29+

# Verify Docker is running
docker ps
# Expected: Shows list of containers (may be empty)
```

### Step 2: Set Environment Variables

Create `.env` file in project root:

```env
# MongoDB
MONGO_USERNAME=admin
MONGO_PASSWORD=password123
MONGO_INITDB_DATABASE=taskflow

# Backend
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost

# Frontend
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Build Docker Images

```bash
# Navigate to project directory
cd "C:\temporary projects\New folder\taskflow"

# Build all images (no cache)
docker-compose build --no-cache

# Expected output: Successfully tagged taskflow-frontend:latest
#                  Successfully tagged taskflow-backend:latest
```

### Step 4: Start Services

```bash
# Start all containers in background
docker-compose up -d

# Expected output: ✓ Container taskflow-mongodb  Started
#                  ✓ Container taskflow-backend   Started
#                  ✓ Container taskflow-frontend  Started
```

### Step 5: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Expected:
# NAME                 STATUS        PORTS
# taskflow-mongodb     Up 2 seconds   0.0.0.0:27017->27017/tcp
# taskflow-backend     Up 2 seconds   0.0.0.0:5000->5000/tcp
# taskflow-frontend    Up 2 seconds   0.0.0.0:80->80/tcp
```

### Step 6: Test Services

```bash
# Test Backend API
curl http://localhost:5000/api/health
# Expected: Response from API

# Test Frontend
# Open browser: http://localhost
# Expected: TaskFlow login page

# Test MongoDB Connection
docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin
# Expected: MongoDB shell prompt
# Type: exit
```

---

## Access the Application

After successful deployment:

| Service      | URL                   | Port  |
| ------------ | --------------------- | ----- |
| **Frontend** | http://localhost      | 80    |
| **Backend**  | http://localhost:5000 | 5000  |
| **MongoDB**  | localhost             | 27017 |

### Default Login Credentials

| Role    | Email                 | Password    |
| ------- | --------------------- | ----------- |
| Manager | manager@taskflow.demo | Manager123! |
| User    | user@taskflow.demo    | User1234!   |

---

## Common Operations

### View Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# View last 100 lines
docker-compose logs --tail=100
```

### Stop Services

```bash
# Stop services (keeps data)
docker-compose stop

# Resume stopped services
docker-compose start

# Stop and remove containers (keeps data)
docker-compose down

# Stop, remove containers AND volumes (deletes data!)
docker-compose down -v
```

### Rebuild Services

```bash
# Rebuild without using cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache backend
```

### Database Management

```bash
# Seed database with demo data
docker-compose exec backend npm run seed

# Connect to MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin

# Backup database
docker-compose exec mongodb mongodump -u admin -p password123 --authenticationDatabase admin --out /backup

# Restore database
docker-compose exec mongodb mongorestore -u admin -p password123 --authenticationDatabase admin /backup
```

### File Upload Access

```bash
# Access uploaded files
docker-compose exec backend ls -la uploads/

# Copy file from container
docker cp taskflow-backend:/app/uploads/filename.txt ./local-path/
```

---

## Troubleshooting

### Docker Daemon Not Running

**Problem**: `Cannot connect to Docker daemon`

**Solution (Windows)**:

1. Open Docker Desktop
2. Wait for Docker to fully initialize
3. Try command again

**Solution (Linux)**:

```bash
sudo systemctl start docker
```

### Port Already in Use

**Problem**: `Bind for 0.0.0.0:80 failed`

**Solution**:

```bash
# Find process using port 80
netstat -ano | findstr :80  # Windows
sudo lsof -i :80            # Linux/Mac

# Edit docker-compose.yml to change ports
# Change "80:80" to "8080:80" for example
```

### Container Crashes on Startup

**Problem**: Services start but crash immediately

**Solution**:

```bash
# Check logs
docker-compose logs backend

# Common fixes:
# 1. Rebuild without cache
docker-compose build --no-cache

# 2. Remove all containers and volumes
docker-compose down -v

# 3. Start fresh
docker-compose up -d
```

### MongoDB Connection Failed

**Problem**: Backend cannot connect to MongoDB

**Solution**:

```bash
# Verify MongoDB is running
docker-compose ps

# Check MongoDB logs
docker-compose logs mongodb

# Verify network connectivity
docker-compose exec backend ping mongodb

# Reset MongoDB
docker-compose down -v
docker-compose up -d
```

### Frontend Shows Blank Page

**Problem**: Frontend loads but shows nothing

**Solution**:

```bash
# Check frontend logs
docker-compose logs frontend

# Clear browser cache and reload (Ctrl+Shift+Del)

# Rebuild frontend
docker-compose build --no-cache frontend

# Restart frontend
docker-compose restart frontend
```

### API Connection Error in Frontend

**Problem**: Frontend cannot reach backend API

**Solution**:

```bash
# Verify backend is running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Verify API is accessible
curl http://localhost:5000/api/health

# Check VITE_API_URL in .env
# Should be: http://localhost:5000/api
```

---

## Performance Optimization

### For Development

Use development compose file:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This includes:

- Hot reload for backend and frontend
- Better logging
- Lighter images

### For Production

1. **Update .env**:

   ```env
   NODE_ENV=production
   JWT_SECRET=use-strong-random-key
   FRONTEND_URL=https://yourdomain.com
   ```

2. **Use production compose**:

   ```bash
   docker-compose up -d
   ```

3. **Set up reverse proxy** (Nginx/Traefik)

4. **Enable HTTPS/SSL**

5. **Add monitoring**:
   ```bash
   docker-compose logs -f
   ```

---

## Scaling Considerations

For production deployment with multiple instances:

1. **Load Balancer**: Add Nginx/HAProxy upstream
2. **Session Storage**: Move from memory to Redis
3. **File Storage**: Use S3 or similar for uploads
4. **Database Backup**: Enable MongoDB backups
5. **Monitoring**: Add Prometheus/Grafana
6. **Logging**: Centralize with ELK stack

---

## GitHub Repository

**Repository URL**: https://github.com/yaswanth65/task3ProU

**Deploy from GitHub**:

```bash
# Clone the repository
git clone https://github.com/yaswanth65/task3ProU.git
cd task3ProU

# Deploy
docker-compose build
docker-compose up -d
```

---

## Support & Resources

- **GitHub Issues**: https://github.com/yaswanth65/task3ProU/issues
- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose Docs**: https://docs.docker.com/compose/

---

## Deployment Checklist

- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Ports 80, 5000, 27017 available
- [ ] .env file created
- [ ] Images built successfully
- [ ] Containers running
- [ ] Frontend accessible at localhost
- [ ] Backend responding at localhost:5000
- [ ] Can login with demo credentials
- [ ] MongoDB seeded with sample data
- [ ] File uploads working
- [ ] Real-time messaging functional

---

**Last Updated**: November 28, 2025
**Version**: 1.0

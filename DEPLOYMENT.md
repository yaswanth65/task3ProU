# TaskFlow Application Deployment Guide

## Prerequisites

- Docker Engine installed and running
- Docker Compose installed
- Git (already initialized)
- Node.js (for local development)

## Local Deployment Steps

### 1. Start Docker Desktop/Engine

On Windows, ensure Docker Desktop is running or Docker service is active.

### 2. Clone the Repository

```bash
git clone https://github.com/yaswanth65/task3ProU.git
cd task3ProU
```

### 3. Create Environment File

The `.env` file has already been created with default values. Update if needed:

```bash
MONGO_USERNAME=admin
MONGO_PASSWORD=password123
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 4. Build Docker Images

```bash
docker-compose build
```

### 5. Start the Application

```bash
docker-compose up -d
```

### 6. Verify Services

```bash
docker-compose ps
```

### 7. Access the Application

- Frontend: http://localhost
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### 8. Seed Database (Optional)

```bash
docker-compose exec backend npm run seed
```

## Docker Services

### MongoDB

- Port: 27017
- Username: admin
- Password: password123
- Database: taskflow

### Backend API

- Port: 5000
- Environment: Production
- Node Version: 20-Alpine

### Frontend

- Port: 80
- Build: Nginx + React
- Built with Vite

## Troubleshooting

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

### View Logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Rebuild Without Cache

```bash
docker-compose build --no-cache
```

## Production Deployment

For production deployment, update:

1. `JWT_SECRET` - Use a strong secret
2. `MONGO_PASSWORD` - Use a strong password
3. `FRONTEND_URL` - Update to actual domain
4. Consider using a reverse proxy (Nginx, Traefik)
5. Enable HTTPS/SSL
6. Set up monitoring and logging

## GitHub Repository

Repository is available at: https://github.com/yaswanth65/task3ProU

All changes have been committed and pushed to the main branch.

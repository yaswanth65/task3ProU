# 🚀 TaskFlow - Render Deployment Guide

## One-Click Deployment to Render

This guide explains how to deploy TaskFlow to Render with **zero manual configuration**. Everything is automated!

---

## 📋 Prerequisites

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Render Account** - Free account at https://render.com
3. **MongoDB Atlas Account** (Optional) - For managed database at https://www.mongodb.com/cloud/atlas

---

## ⚡ Quick Deployment (3 Steps)

### Step 1: Push to GitHub

Ensure your code is pushed to your GitHub repository:

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### Step 2: Connect GitHub to Render

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"**
4. Authorize Render with GitHub
5. Select your **task3ProU** repository
6. Click **"Connect"**

### Step 3: Render Auto-Detects Configuration

✅ Render will automatically:

- Read your `render.yaml` file
- Deploy Backend API service
- Deploy Frontend static site
- Set up environment variables
- Create MongoDB database (if needed)
- Configure health checks
- Enable auto-deployments

**That's it! Your app is deployed.**

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────┐
│        Render Dashboard             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   GitHub → Render Auto-Deploy       │
└─────────────────────────────────────┘
           ↓
   ┌───────────────────────┐
   │   Three Services:     │
   ├───────────────────────┤
   │ 1. Backend API        │ ← Node.js
   │ 2. Frontend Static    │ ← Nginx
   │ 3. MongoDB (Optional) │ ← Database
   └───────────────────────┘
           ↓
   ┌───────────────────────┐
   │   Your Domain         │
   │ *.onrender.com        │
   └───────────────────────┘
```

---

## 📝 Configuration Files Included

Your project now includes everything needed:

### `render.yaml` - Infrastructure as Code

- Defines all 3 services automatically
- Specifies build commands
- Sets up environment variables
- Configures health checks
- Enables auto-deploy from GitHub

### `.env.example` - Environment Template

- All required environment variables
- Copy to `.env` locally
- Never commit `.env` (add to `.gitignore`)

### Updated `Dockerfiles`

- Render-compatible port configuration
- Health checks included
- Production-optimized builds
- WebSocket support

### `render-build.sh` - Build Script

- Automated build process
- Compiles both backend and frontend
- Installs dependencies in correct order

---

## 🔧 Environment Configuration on Render

### Backend Service Environment Variables

After deployment, Render Dashboard shows these variables:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=[AUTO-GENERATED]
JWT_EXPIRES_IN=7d
MONGODB_URI=[FROM DATABASE SERVICE]
FRONTEND_URL=https://taskflow-frontend.onrender.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

```env
VITE_API_URL=https://taskflow-backend.onrender.com/api
VITE_SOCKET_URL=https://taskflow-backend.onrender.com
```

---

## 📊 What Gets Deployed

### Backend Service

- **Runtime**: Node.js 20
- **Build**: `cd backend && npm install && npm run build`
- **Start**: `cd backend && npm start`
- **Health Check**: `/api/health`
- **URL**: `https://taskflow-backend.onrender.com`

### Frontend Service

- **Type**: Static site
- **Build**: `cd frontend && npm install && npm run build`
- **Publish Path**: `frontend/dist`
- **URL**: `https://taskflow-frontend.onrender.com`

### Database Service (Optional)

- **Type**: MongoDB (free plan)
- **Region**: Oregon
- **Connection**: Auto-linked to backend
- **Backup**: Automatic

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `render.yaml` present in root directory
- [ ] `.env.example` file exists
- [ ] Both `Dockerfile`s updated for Render
- [ ] `render-build.sh` present
- [ ] Backend `package.json` has build script
- [ ] Frontend `package.json` has build script

---

## 🚀 Custom Domain Setup

After deployment to Render free domain (`*.onrender.com`):

### Add Custom Domain

1. Go to your **Web Service** on Render
2. Click **Settings** → **Custom Domain**
3. Add your domain (e.g., `taskflow.com`)
4. Update DNS records with Render's values
5. SSL certificate auto-installed

### Example DNS Setup

```
Subdomain: api
CNAME: taskflow-backend.onrender.com
TTL: 3600

Subdomain: @
CNAME: taskflow-frontend.onrender.com
TTL: 3600
```

---

## 🔐 Security Best Practices

### JWT Secret

- ✅ Render auto-generates secure JWT_SECRET
- ✅ Different for each deployment
- ❌ Never commit real secrets to GitHub

### MongoDB Connection

- ✅ Use MongoDB Atlas for production
- ✅ Restrict IP whitelist to Render IPs
- ✅ Enable SSL/TLS connections

### Environment Variables

- ✅ Set all sensitive vars in Render Dashboard
- ✅ Use `.env.example` (without secrets)
- ✅ Never commit `.env` file

---

## 📡 Monitoring & Logs

### View Deployment Logs

On Render Dashboard:

1. Select your **service**
2. Click **Logs** tab
3. See real-time deployment progress
4. Check for errors

### Common Log Messages

```
✓ Build started
✓ Installing dependencies...
✓ Building TypeScript...
✓ Starting server on port 5000
✓ MongoDB connected
✓ Server ready
```

### Health Checks

Render automatically runs `/api/health` every 30 seconds:

```json
{
  "status": "ok",
  "timestamp": "2025-11-28T10:30:45.123Z",
  "environment": "production"
}
```

---

## 🔄 Auto-Deployment from GitHub

Every time you push to GitHub's `main` branch:

1. ✅ GitHub notifies Render
2. ✅ Render pulls latest code
3. ✅ Runs build commands
4. ✅ Deploys new version
5. ✅ Runs health checks
6. ✅ Routes traffic to new version

**No manual deployment needed!**

---

## 🆘 Troubleshooting

### Deployment Failed - Build Error

```
Error: npm ERR! code ERESOLVE
```

**Solution:**

- Update `package.json` dependencies
- Test locally: `npm install`
- Push to GitHub
- Render will retry automatically

### Service Crashes After Deploy

```
Error: Cannot find module 'express'
```

**Solution:**

1. Check `backend/package.json` exists
2. Verify build command: `npm run build`
3. Check `start` script: `node dist/server.js`
4. View logs for details

### Frontend Shows Blank Page

```
VITE_API_URL not set
```

**Solution:**

1. Go to Frontend Service Settings
2. Add Environment Variables:
   - `VITE_API_URL=https://taskflow-backend.onrender.com/api`
   - `VITE_SOCKET_URL=https://taskflow-backend.onrender.com`
3. Redeploy service

### Backend Cannot Connect to MongoDB

```
MongoNetworkError: failed to connect
```

**Solution:**

1. Verify `MONGODB_URI` set correctly
2. Check MongoDB Atlas IP whitelist
3. Add Render's IPs to whitelist
4. Test connection: `npm run dev`

### WebSocket Connection Failed

```
Failed to connect to socket
```

**Solution:**

1. Verify `VITE_SOCKET_URL` set in frontend
2. Check backend serving socket.io on `/socket.io`
3. Verify CORS allows frontend origin
4. Restart services

---

## 📈 Performance Optimization

### For Free Plan

- ✅ Reasonable performance for small teams
- ❌ Services spin down after 15 min inactivity
- ❌ Limited to 750 build minutes/month

### Upgrade for Production

1. **Paid Plans** - Eliminate spindown
2. **PostgreSQL** - Better than MongoDB for some use cases
3. **Redis** - For session storage and caching
4. **CDN** - For faster static file delivery

---

## 🗂️ Project Structure

```
taskflow/
├── render.yaml              ← Render config (AUTO-DEPLOY)
├── .env.example             ← Environment template
├── render-build.sh          ← Build script
├── backend/
│   ├── Dockerfile           ← Render-optimized
│   ├── package.json         ← Build script required
│   └── src/server.ts        ← Listens on all interfaces
├── frontend/
│   ├── Dockerfile           ← Render-optimized
│   ├── nginx.conf           ← Updated for port 3000
│   └── package.json         ← Build script required
└── docker-compose.yml       ← For local development
```

---

## 🎓 Learn More

- **Render Docs**: https://render.com/docs
- **Render Dashboard**: https://dashboard.render.com
- **GitHub Integration**: https://render.com/docs/github
- **Infrastructure as Code**: https://render.com/docs/infrastructure-as-code

---

## 🚀 Next Steps

### After Successful Deployment

1. **Test the application**

   - Visit frontend URL
   - Login with demo credentials
   - Create a task
   - Send a message

2. **Set up monitoring**

   - Enable email alerts
   - Add custom domain
   - Configure SSL

3. **Production hardening**
   - Use MongoDB Atlas
   - Set strong JWT_SECRET
   - Configure rate limiting
   - Add logging service

---

## 💡 Pro Tips

### Faster Deployments

- Keep dependencies updated
- Use `npm ci` instead of `npm install` (deterministic)
- Avoid large files in repo (use `.gitignore`)

### Better Monitoring

- Set up Sentry for error tracking
- Use LogRocket for session replay
- Enable Render alerts

### Cost Optimization

- Free tier good for development
- Use shared databases initially
- Scale horizontally with load balancers

---

## 🤝 Support

- **GitHub Issues**: https://github.com/yaswanth65/task3ProU/issues
- **Render Support**: https://render.com/support
- **Documentation**: Check `README.md`

---

**🎉 Deployment Complete!**

Your TaskFlow application is now deployed to Render with automatic GitHub integration.

Every push to GitHub triggers automatic deployment. No manual work needed!

---

**Last Updated**: November 28, 2025
**Version**: 1.0

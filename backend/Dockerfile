# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci
RUN cd backend && npm ci

# Copy source files
COPY . .

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/uploads ./uploads

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port (Render expects PORT environment variable)
EXPOSE $PORT

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the server
CMD ["node", "dist/server.js"]

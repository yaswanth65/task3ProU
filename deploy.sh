#!/bin/bash

# TaskFlow Deployment Script
# This script deploys the entire TaskFlow application using Docker Compose

set -e

echo "======================================"
echo "TaskFlow Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}Docker daemon is not running. Please start Docker.${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}Step 1: Stopping any existing containers...${NC}"
docker-compose down || true

echo -e "${YELLOW}Step 2: Building Docker images...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}Step 3: Starting services...${NC}"
docker-compose up -d

echo -e "${YELLOW}Step 4: Waiting for services to be ready...${NC}"
sleep 5

echo -e "${YELLOW}Step 5: Verifying services...${NC}"
docker-compose ps

echo -e "${GREEN}======================================"
echo "TaskFlow Deployment Complete!"
echo "======================================${NC}"
echo ""
echo -e "${GREEN}Access the application at:${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost${NC}"
echo -e "  Backend API: ${YELLOW}http://localhost:5000${NC}"
echo -e "  MongoDB: ${YELLOW}localhost:27017${NC}"
echo ""
echo -e "${GREEN}To view logs:${NC}"
echo -e "  ${YELLOW}docker-compose logs -f${NC}"
echo ""
echo -e "${GREEN}To stop the application:${NC}"
echo -e "  ${YELLOW}docker-compose down${NC}"
echo ""

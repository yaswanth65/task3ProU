@echo off
REM TaskFlow Deployment Script for Windows
REM This script deploys the entire TaskFlow application using Docker Compose

setlocal enabledelayedexpansion

echo ======================================
echo TaskFlow Deployment Script
echo ======================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Check if Docker daemon is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker daemon is not running. Please start Docker Desktop.
    exit /b 1
)

cd /d "%~dp0"

echo [Step 1] Stopping any existing containers...
docker-compose down

echo [Step 2] Building Docker images...
docker-compose build --no-cache

if %errorlevel% neq 0 (
    echo Docker build failed!
    exit /b 1
)

echo [Step 3] Starting services...
docker-compose up -d

if %errorlevel% neq 0 (
    echo Failed to start services!
    exit /b 1
)

echo [Step 4] Waiting for services to be ready...
timeout /t 5 /nobreak

echo [Step 5] Verifying services...
docker-compose ps

echo.
echo ======================================
echo TaskFlow Deployment Complete!
echo ======================================
echo.
echo Access the application at:
echo   Frontend: http://localhost
echo   Backend API: http://localhost:5000
echo   MongoDB: localhost:27017
echo.
echo To view logs:
echo   docker-compose logs -f
echo.
echo To stop the application:
echo   docker-compose down
echo.

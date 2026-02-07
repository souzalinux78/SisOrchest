@echo off
SETLOCAL EnableDelayedExpansion

TITLE SisOrchest Launcher

ECHO ==========================================
ECHO      SisOrchest - System Launcher
ECHO ==========================================

:: Check if node_modules exists
IF NOT EXIST "node_modules" (
    ECHO [INFO] node_modules not found. Installing dependencies...
    cmd /c npm install
    IF %ERRORLEVEL% NEQ 0 (
        ECHO [ERROR] Failed to install dependencies. Please check your Node.js installation.
        PAUSE
        EXIT /B %ERRORLEVEL%
    )
    ECHO [SUCCESS] Dependencies installed.
)

:: Check for .env file
IF NOT EXIST ".env" (
    ECHO [WARNING] .env file not found in root!
    IF EXIST "server\env.example" (
        ECHO [INFO] Copying server/env.example to .env...
        COPY "server\env.example" ".env"
    ) ELSE (
        ECHO [ERROR] No env.example found. Please configure .env manually.
    )
)

ECHO.
ECHO Starting Backend Server...
start "SisOrchest Backend" cmd /k "npm run server"

ECHO.
ECHO Starting Frontend Application...
start "SisOrchest Frontend" cmd /k "npm run dev"

ECHO.
ECHO System started!
ECHO Two new windows have been opened for Backend and Frontend.
ECHO.
ECHO Backend typically runs on: http://localhost:4000
ECHO Frontend typically runs on: http://localhost:5173
ECHO.
PAUSE

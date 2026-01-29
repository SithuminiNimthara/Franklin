@echo off
cd /d "%~dp0"
echo Starting Backend (Node.js Port 5000)...
cd Backend
npm install >nul 2>&1
node src/server.js

@echo off
setlocal

cd /d "%~dp0"

echo Starting Nexus Chat backend server...
start "Nexus API Server" cmd /k "npm run server"

echo Starting Nexus Chat frontend dev server...
start "Nexus Dev Server" cmd /k "npm run dev"

echo Starting Cloudflare public tunnel...
start "Nexus Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:5173"

echo.
echo Keep all three windows open while sharing/testing the app.
echo Open the Cloudflare terminal window and copy the https://*.trycloudflare.com URL.
echo.
pause

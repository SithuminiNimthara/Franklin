@echo off
echo Installing dependencies...
pip install fastapi uvicorn ultralytics opencv-python python-multipart

echo.
echo Starting Unified Backend Server...
echo The server will be available at http://localhost:8000
echo Keep this window open while using the Simulation Mode.
echo.

python Models/Unified_Backend/app.py
pause

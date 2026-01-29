@echo off
cd /d "%~dp0"
echo Starting Disease Detection Service (Port 8001)...
python Models/Disease_Detection/api.py

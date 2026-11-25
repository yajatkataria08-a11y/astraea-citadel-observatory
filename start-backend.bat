@echo off
cd /d "%~dp0backend"
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
)
echo Starting ASTRAEA Observatory Backend Engine...
python run.py

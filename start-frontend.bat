@echo off
if exist "d:\COODING\Projects\Project Exibition\nodejs" (
  set "PATH=d:\COODING\Projects\Project Exibition\nodejs;%PATH%"
)
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
)
echo Starting ASTRAEA Observatory Frontend...
call npm run dev

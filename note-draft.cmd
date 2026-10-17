@echo off
rem Double-click to pull the latest article and save it to note as a draft (asks before saving).
chcp 65001 > nul
cd /d "%~dp0"
call npm.cmd run note:go
echo.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0..\apps\api"

if not exist "data" mkdir "data"
node dist\main.js > "data\api.log" 2>&1

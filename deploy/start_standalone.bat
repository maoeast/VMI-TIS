@echo off
setlocal EnableExtensions
chcp 65001 >nul
title 星眸智康 VMI-TIS 单机版

for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "API_DIR=%ROOT%\apps\api"
set "DATA_DIR=%API_DIR%\data"
set "DB_FILE=%DATA_DIR%\vmi_tis.db"
set "PORT=3000"
set "API_PID="

echo ========================================
echo    星眸智康 VMI-TIS 单机版启动中...
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js。请安装 Node.js 20 或更高版本后重试。
  if not defined VMI_TIS_NO_PAUSE pause
  exit /b 1
)

netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo [错误] 端口 %PORT% 已被占用，请关闭占用进程后重试。
  if not defined VMI_TIS_NO_PAUSE pause
  exit /b 1
)

if not exist "%ROOT%\node_modules" (
  echo [初始化] 首次运行，安装依赖（约 1-2 分钟）...
  call npm install --prefix "%ROOT%"
  if errorlevel 1 goto :failed
)

if not exist "%API_DIR%\dist\main.js" (
  echo [初始化] 编译后端服务...
  call npm run build --prefix "%ROOT%"
  if errorlevel 1 goto :failed
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

echo [初始化] 同步数据库结构...
pushd "%API_DIR%"
call npx prisma db push --schema ../../prisma/schema.prisma --skip-generate
if errorlevel 1 (
  popd
  goto :failed
)

echo [初始化] 导入 13 张操作卡与 6 名示例学生...
call npm run db:seed
if errorlevel 1 (
  popd
  goto :failed
)
popd

echo [启动] 后端 API 服务（端口 %PORT%）...
start "VMI-TIS API" /MIN "%ROOT%\deploy\run_api.bat"

echo [检查] 等待 API 就绪...
set /a RETRY=0
:wait_api
set /a RETRY+=1
node -e "fetch('http://localhost:%PORT%/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >nul 2>nul
if not errorlevel 1 goto :ready
if %RETRY% GEQ 30 (
  echo [错误] API 未能在 30 秒内就绪，请查看日志：%DATA_DIR%\api.log
  goto :failed
)
ping -n 2 127.0.0.1 >nul
goto :wait_api

:ready
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do set "API_PID=%%A"
echo.
echo [就绪] 系统已启动：http://localhost:%PORT%
echo [提示] 保持本窗口开启；按任意键退出并停止服务。
if not defined VMI_TIS_NO_BROWSER start "" "http://localhost:%PORT%"
if not defined VMI_TIS_NO_PAUSE pause >nul

if defined API_PID (
  taskkill /PID %API_PID% /T /F >nul 2>nul
)
exit /b 0

:failed
echo.
echo [失败] 启动未完成，请根据上方错误信息排查。
echo 日志文件：%DATA_DIR%\api.log
if not defined VMI_TIS_NO_PAUSE pause
exit /b 1

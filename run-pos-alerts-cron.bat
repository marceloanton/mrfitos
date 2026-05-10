@echo off
setlocal

REM Configuracion basica
set "BASE_URL=http://localhost:8080"
set "TENANT_ID=1"
set "GYM_ID=1"
set "DIFF_THRESHOLD=0"
set "VOIDS_THRESHOLD=3"
set "COOLDOWN_MINUTES=60"

REM Token: usa CRON_BEARER_TOKEN del entorno o define uno aca.
if "%CRON_BEARER_TOKEN%"=="" (
  echo [ERROR] Falta CRON_BEARER_TOKEN en el entorno.
  echo.
  echo Ejemplo:
  echo   setx CRON_BEARER_TOKEN "TU_TOKEN"
  echo   cerrar y abrir consola, luego ejecutar este .bat
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-pos-alerts-cron.ps1" ^
  -BaseUrl "%BASE_URL%" ^
  -TenantId %TENANT_ID% ^
  -GymId %GYM_ID% ^
  -DifferenceThreshold %DIFF_THRESHOLD% ^
  -VoidsThreshold %VOIDS_THRESHOLD% ^
  -CooldownMinutes %COOLDOWN_MINUTES%

if errorlevel 1 (
  echo [ERROR] Fallo la ejecucion del cron POS alerts.
  exit /b 1
)

echo [OK] Cron POS alerts ejecutado.
exit /b 0

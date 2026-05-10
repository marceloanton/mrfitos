param(
  [string]$ProjectRoot = "c:\Users\Marce\OneDrive\Escritorio\htdocs\gymsaas",
  [string]$DbName = "gymsaas",
  [string]$DbUser = "root",
  [string]$DbPassword = "",
  [string]$MysqlBin = "C:\xampp\mysql\bin",
  [string]$PhpExe = "C:\xampp\php\php.exe",
  [string]$ApiBaseUrl = "https://api.tu-dominio.com",
  [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Fail($msg) { throw $msg }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $ProjectRoot "backend/database/backups"
$migration = Join-Path $ProjectRoot "backend/database/migrations/2026_05_07_deploy_readiness.sql"
$frontendDir = Join-Path $ProjectRoot "frontend"
$envPath = Join-Path $ProjectRoot "backend/.env"
$reportDir = Join-Path $ProjectRoot "release-reports"
$reportPath = Join-Path $reportDir ("release_prod_${timestamp}.json")

$mysql = Join-Path $MysqlBin "mysql.exe"
$mysqldump = Join-Path $MysqlBin "mysqldump.exe"

$report = [ordered]@{
  mode = "production"
  timestamp = (Get-Date).ToString("o")
  db_name = $DbName
  api_base_url = $ApiBaseUrl
  auto_approve = [bool]$AutoApprove
  steps = [ordered]@{
    env_validation = "pending"
    php_lint = "pending"
    frontend_build = "pending"
    db_backup = "pending"
    migration = "pending"
    health_check = "pending"
  }
  backup_file = $null
  success = $false
  error = $null
}

New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

try {
  if (!(Test-Path $mysql)) { Fail "mysql.exe not found at $mysql" }
  if (!(Test-Path $mysqldump)) { Fail "mysqldump.exe not found at $mysqldump" }
  if (!(Test-Path $PhpExe)) { Fail "php.exe not found at $PhpExe" }
  if (!(Test-Path $migration)) { Fail "Migration file not found: $migration" }
  if (!(Test-Path $envPath)) { Fail "backend/.env not found" }

  Step "Validating production environment settings"
  $envLines = Get-Content $envPath
  $envMap = @{}
  foreach($line in $envLines){
    if ($line -match '^\s*#' -or -not ($line -match '=')) { continue }
    $parts = $line.Split('=',2)
    $k = $parts[0].Trim(); $v = $parts[1].Trim()
    $envMap[$k] = $v
  }

  if (($envMap['APP_ENV'] ?? '') -ne 'production') { Fail "APP_ENV must be production" }
  if (($envMap['APP_DEBUG'] ?? '') -ne 'false') { Fail "APP_DEBUG must be false" }
  if ([string]::IsNullOrWhiteSpace($envMap['APP_KEY'])) { Fail "APP_KEY is required" }
  if (($envMap['APP_KEY'] ?? '') -match '^change_this|REEMPLAZAR') { Fail "APP_KEY still looks like placeholder" }

  $cors = $envMap['CORS_ALLOWED_ORIGINS'] ?? ''
  if ([string]::IsNullOrWhiteSpace($cors)) { Fail "CORS_ALLOWED_ORIGINS is required" }
  if ($cors -match 'localhost|127\.0\.0\.1') { Fail "CORS_ALLOWED_ORIGINS must not include localhost in production" }

  $dbPass = $envMap['DB_PASSWORD'] ?? ''
  if ([string]::IsNullOrWhiteSpace($dbPass)) { Fail "DB_PASSWORD must not be empty in production" }
  $report.steps.env_validation = "ok"
  Ok "Environment validation passed"

  if (-not $AutoApprove) {
    Write-Host ""
    Write-Host "About to run production release against DB '$DbName' and API '$ApiBaseUrl'." -ForegroundColor Yellow
    $confirm = Read-Host "Type RELEASE to continue"
    if ($confirm -ne 'RELEASE') { Fail "Release aborted by user" }
  }

  $mysqlArgsAuth = @("-u", $DbUser)
  if ($DbPassword -ne "") { $mysqlArgsAuth += @("-p$DbPassword") }

  Step "Running PHP syntax checks"
  Get-ChildItem -Path (Join-Path $ProjectRoot "backend") -Recurse -Filter *.php | ForEach-Object {
    & $PhpExe -l $_.FullName | Out-Null
  }
  $report.steps.php_lint = "ok"
  Ok "PHP syntax checks passed"

  Step "Building frontend"
  Push-Location $frontendDir
  try { npm run build | Out-Host } finally { Pop-Location }
  $report.steps.frontend_build = "ok"
  Ok "Frontend build passed"

  Step "Creating mandatory MySQL backup"
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  $backupFile = Join-Path $backupDir ("${DbName}_prod_${timestamp}.sql")
  $dumpArgs = $mysqlArgsAuth + @($DbName)
  & $mysqldump @dumpArgs > $backupFile
  if (!(Test-Path $backupFile)) { Fail "Backup file not created" }
  $report.steps.db_backup = "ok"
  $report.backup_file = $backupFile
  Ok "Backup created: $backupFile"

  Step "Applying incremental migration"
  $migrationPathUnix = $migration -replace '\\','/'
  $sourceCmd = "source $migrationPathUnix"
  $mysqlArgs = $mysqlArgsAuth + @("--database=$DbName", "--execute=$sourceCmd")
  & $mysql @mysqlArgs
  $report.steps.migration = "ok"
  Ok "Migration applied"

  Step "Health check"
  $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -TimeoutSec 15
  if (-not $health.success) { Fail "Health endpoint returned non-success" }
  $report.steps.health_check = "ok"
  Ok "API health check passed"

  $report.success = $true

  Step "Production release summary"
  Write-Host "- Environment validation: OK"
  Write-Host "- PHP syntax: OK"
  Write-Host "- Frontend build: OK"
  Write-Host "- DB backup: OK ($backupFile)"
  Write-Host "- Migration: OK"
  Write-Host "- API health: OK"

  Ok "Production release finished"
}
catch {
  $report.success = $false
  $report.error = $_.Exception.Message
  throw
}
finally {
  $report | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath
  Write-Host "Release report: $reportPath"
}

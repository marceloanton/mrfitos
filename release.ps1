param(
  [string]$ProjectRoot = "c:\Users\Marce\OneDrive\Escritorio\htdocs\gymsaas",
  [string]$DbName = "gymsaas",
  [string]$DbUser = "root",
  [string]$DbPassword = "",
  [string]$MysqlBin = "C:\xampp\mysql\bin",
  [string]$PhpExe = "C:\xampp\php\php.exe",
  [string]$ApiBaseUrl = "http://localhost:8080",
  [switch]$SkipBackup,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $ProjectRoot "backend/database/backups"
$migration = Join-Path $ProjectRoot "backend/database/migrations/2026_05_07_deploy_readiness.sql"
$frontendDir = Join-Path $ProjectRoot "frontend"
$reportDir = Join-Path $ProjectRoot "release-reports"
$reportPath = Join-Path $reportDir ("release_${timestamp}.json")

$mysql = Join-Path $MysqlBin "mysql.exe"
$mysqldump = Join-Path $MysqlBin "mysqldump.exe"

$report = [ordered]@{
  mode = "standard"
  timestamp = (Get-Date).ToString("o")
  db_name = $DbName
  api_base_url = $ApiBaseUrl
  skip_backup = [bool]$SkipBackup
  skip_build = [bool]$SkipBuild
  steps = [ordered]@{
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
  if (!(Test-Path $mysql)) { throw "mysql.exe not found at $mysql" }
  if (!(Test-Path $mysqldump)) { throw "mysqldump.exe not found at $mysqldump" }
  if (!(Test-Path $PhpExe)) { throw "php.exe not found at $PhpExe" }
  if (!(Test-Path $migration)) { throw "Migration file not found: $migration" }

  $mysqlArgsAuth = @("-u", $DbUser)
  if ($DbPassword -ne "") { $mysqlArgsAuth += @("-p$DbPassword") }

  Step "Running PHP syntax checks"
  Get-ChildItem -Path (Join-Path $ProjectRoot "backend") -Recurse -Filter *.php | ForEach-Object {
    & $PhpExe -l $_.FullName | Out-Null
  }
  $report.steps.php_lint = "ok"
  Ok "PHP syntax checks passed"

  if (-not $SkipBuild) {
    Step "Building frontend"
    Push-Location $frontendDir
    try { npm run build | Out-Host } finally { Pop-Location }
    $report.steps.frontend_build = "ok"
    Ok "Frontend build passed"
  } else {
    $report.steps.frontend_build = "skipped"
    Warn "Skipping frontend build"
  }

  if (-not $SkipBackup) {
    Step "Creating MySQL backup"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $backupFile = Join-Path $backupDir ("${DbName}_${timestamp}.sql")
    $dumpArgs = $mysqlArgsAuth + @($DbName)
    & $mysqldump @dumpArgs > $backupFile
    $report.steps.db_backup = "ok"
    $report.backup_file = $backupFile
    Ok "Backup created: $backupFile"
  } else {
    $report.steps.db_backup = "skipped"
    Warn "Skipping backup"
  }

  Step "Applying incremental migration"
  $migrationPathUnix = $migration -replace '\\','/'
  $sourceCmd = "source $migrationPathUnix"
  $mysqlArgs = $mysqlArgsAuth + @("--database=$DbName", "--execute=$sourceCmd")
  & $mysql @mysqlArgs
  $report.steps.migration = "ok"
  Ok "Migration applied"

  Step "Health check"
  $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -TimeoutSec 10
  if (-not $health.success) { throw "Health endpoint returned non-success" }
  $report.steps.health_check = "ok"
  Ok "API health check passed"

  $report.success = $true

  Step "Release checklist summary"
  Write-Host "- PHP syntax: OK"
  Write-Host ("- Frontend build: {0}" -f $(if($SkipBuild){"SKIPPED"}else{"OK"}))
  Write-Host ("- DB backup: {0}" -f $(if($SkipBackup){"SKIPPED"}else{"OK"}))
  Write-Host "- Migration: OK"
  Write-Host "- API health: OK"

  Ok "Release script finished"
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

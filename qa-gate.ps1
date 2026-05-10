param(
  [string]$ProjectRoot = "c:\Users\Marce\OneDrive\Escritorio\htdocs\gymsaas",
  [string]$ApiBaseUrl = "http://localhost:8080",
  [string]$Email = "admin@manager.net.ar",
  [string]$Password = "Admin123!",
  [string]$DbName = "gymsaas",
  [string]$DbUser = "root",
  [string]$DbPassword = "",
  [switch]$SkipBackup,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }

$releaseScript = Join-Path $ProjectRoot "release.ps1"
$smokeScript = Join-Path $ProjectRoot "smoke.ps1"
$reportsDir = Join-Path $ProjectRoot "release-reports"

if (!(Test-Path $releaseScript)) { throw "release.ps1 not found" }
if (!(Test-Path $smokeScript)) { throw "smoke.ps1 not found" }

Step "Running release pipeline"
$releaseArgs = @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $releaseScript,
  "-ProjectRoot", $ProjectRoot,
  "-DbName", $DbName,
  "-DbUser", $DbUser,
  "-ApiBaseUrl", $ApiBaseUrl
)
if ($DbPassword -ne "") { $releaseArgs += @("-DbPassword", $DbPassword) }
if ($SkipBackup) { $releaseArgs += "-SkipBackup" }
if ($SkipBuild) { $releaseArgs += "-SkipBuild" }

& powershell @releaseArgs

$latestRelease = Get-ChildItem $reportsDir -Filter "release_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestRelease) { throw "No release report found" }
$releaseReport = Get-Content $latestRelease.FullName -Raw | ConvertFrom-Json
if (-not $releaseReport.success) { throw "Release failed according to report: $($latestRelease.FullName)" }
Ok "Release report OK: $($latestRelease.Name)"

Step "Running smoke tests"
& powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript -ApiBaseUrl $ApiBaseUrl -Email $Email -Password $Password -ProjectRoot $ProjectRoot

$latestSmoke = Get-ChildItem $reportsDir -Filter "smoke_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestSmoke) { throw "No smoke report found" }
$smokeReport = Get-Content $latestSmoke.FullName -Raw | ConvertFrom-Json
if (-not $smokeReport.success) { throw "Smoke failed according to report: $($latestSmoke.FullName)" }
Ok "Smoke report OK: $($latestSmoke.Name)"

Step "QA gate summary"
Write-Host "- Release report: $($latestRelease.FullName)"
Write-Host "- Smoke report:   $($latestSmoke.FullName)"
Ok "QA gate passed"

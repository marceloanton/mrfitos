param(
  [string]$ApiBaseUrl = "http://localhost:8080",
  [string]$Email = "admin@manager.net.ar",
  [string]$Password = "Admin123!",
  [string]$ProjectRoot = "c:\Users\Marce\OneDrive\Escritorio\htdocs\gymsaas"
)

$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Get-HeaderValue($headers, [string]$name) {
  if (-not $headers) { return $null }
  foreach ($key in $headers.Keys) {
    if ($key -ieq $name) {
      return [string]$headers[$key]
    }
  }
  return $null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = Join-Path $ProjectRoot "release-reports"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$reportPath = Join-Path $reportDir ("smoke_${timestamp}.json")

$report = [ordered]@{
  mode = "smoke"
  timestamp = (Get-Date).ToString("o")
  api_base_url = $ApiBaseUrl
  steps = [ordered]@{}
  success = $false
  error = $null
}

try {
  Step "Health"
  $h = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -TimeoutSec 10
  if (-not $h.success) { throw "Health failed" }
  $report.steps.health = "ok"
  Ok "Health"

  Step "Public pricing cache"
  $pricingUri = "$ApiBaseUrl/public/pricing"
  $pricingResp1 = Invoke-WebRequest -Uri $pricingUri -Method Get -TimeoutSec 15
  if ($pricingResp1.StatusCode -ne 200) { throw "Public pricing first call expected 200, got $($pricingResp1.StatusCode)" }
  $etag = Get-HeaderValue $pricingResp1.Headers "ETag"
  $cacheControl = Get-HeaderValue $pricingResp1.Headers "Cache-Control"
  $lastModified = Get-HeaderValue $pricingResp1.Headers "Last-Modified"
  if ([string]::IsNullOrWhiteSpace($etag)) { throw "Public pricing missing ETag header on 200 response" }
  if ([string]::IsNullOrWhiteSpace($cacheControl)) { throw "Public pricing missing Cache-Control header on 200 response" }

  $pricingResp2 = Invoke-WebRequest -Uri $pricingUri -Method Get -TimeoutSec 15 -Headers @{ "If-None-Match" = $etag } -SkipHttpErrorCheck
  if ($pricingResp2.StatusCode -ne 304) { throw "Public pricing second call expected 304 with If-None-Match, got $($pricingResp2.StatusCode)" }

  $ifModifiedSinceChecked = $false
  $ifModifiedSinceStatus = $null
  if (-not [string]::IsNullOrWhiteSpace($lastModified)) {
    $ifModifiedSinceChecked = $true
    $pricingResp3 = Invoke-WebRequest -Uri $pricingUri -Method Get -TimeoutSec 15 -Headers @{ "If-Modified-Since" = $lastModified } -SkipHttpErrorCheck
    $ifModifiedSinceStatus = [int]$pricingResp3.StatusCode
    if ($ifModifiedSinceStatus -notin @(200, 304)) {
      throw "Public pricing If-Modified-Since expected 200 or 304, got $ifModifiedSinceStatus"
    }
  }

  $report.steps.pricing_cache = [ordered]@{
    status = "ok"
    first_status = [int]$pricingResp1.StatusCode
    second_status = [int]$pricingResp2.StatusCode
    etag_present = $true
    cache_control_present = $true
    cache_control = $cacheControl
    if_modified_since_checked = $ifModifiedSinceChecked
    if_modified_since_status = $ifModifiedSinceStatus
  }
  Ok "Public pricing cache"

  Step "Login"
  $login = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/login" -Method Post -ContentType "application/json" -Body (@{email=$Email;password=$Password} | ConvertTo-Json)
  if (-not $login.success) { throw "Login failed" }
  $token = $login.data.token
  $tenantId = [string]$login.data.user.tenant_id
  $gymId = [string]$login.data.user.gym_id
  $headers = @{ Authorization = "Bearer $token"; "X-Tenant-Id" = $tenantId; "X-Gym-Id" = $gymId }
  $report.steps.login = "ok"
  Ok "Login"

  Step "Auth me"
  $me = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/me" -Method Get -Headers $headers
  if (-not $me.success) { throw "Auth me failed" }
  $report.steps.auth_me = "ok"

  Step "Dashboard metrics"
  $dash = Invoke-RestMethod -Uri "$ApiBaseUrl/dashboard/metrics" -Method Get -Headers $headers
  if (-not $dash.success) { throw "Dashboard failed" }
  $report.steps.dashboard = "ok"

  Step "Members list"
  $members = Invoke-RestMethod -Uri "$ApiBaseUrl/members?page=1&per_page=1" -Method Get -Headers $headers
  if (-not $members.success) { throw "Members failed" }
  $report.steps.members = "ok"

  Step "Attendance list"
  $att = Invoke-RestMethod -Uri "$ApiBaseUrl/attendance?page=1&per_page=1" -Method Get -Headers $headers
  if (-not $att.success) { throw "Attendance failed" }
  $report.steps.attendance = "ok"

  Step "Reminders expirations"
  $rem = Invoke-RestMethod -Uri "$ApiBaseUrl/reminders/expirations?days=3" -Method Get -Headers $headers
  if (-not $rem.success) { throw "Reminders failed" }
  $report.steps.reminders = "ok"

  Step "Reports renewals"
  $from = (Get-Date -Day 1).ToString('yyyy-MM-dd')
  $to = (Get-Date -Day ([DateTime]::DaysInMonth((Get-Date).Year, (Get-Date).Month))).ToString('yyyy-MM-dd')
  $rep = Invoke-RestMethod -Uri "$ApiBaseUrl/reports/renewals?from=$from&to=$to" -Method Get -Headers $headers
  if (-not $rep.success) { throw "Reports failed" }
  $report.steps.reports = "ok"

  $report.success = $true
  Ok "Smoke completed"
}
catch {
  $report.success = $false
  $report.error = $_.Exception.Message
  throw
}
finally {
  $report | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath
  Write-Host "Smoke report: $reportPath"
}

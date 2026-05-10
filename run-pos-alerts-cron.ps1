param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$CronToken = "",
  [int]$TenantId = 1,
  [int]$GymId = 1,
  [string]$DateFrom = "",
  [string]$DateTo = "",
  [double]$DifferenceThreshold = 0,
  [int]$VoidsThreshold = 3,
  [int]$CooldownMinutes = 60,
  [int]$ContactId = 0,
  [string]$Phone = ""
)

$resolvedToken = $CronToken
if ([string]::IsNullOrWhiteSpace($resolvedToken)) {
  $resolvedToken = $env:CRON_BEARER_TOKEN
}

if ([string]::IsNullOrWhiteSpace($resolvedToken)) {
  Write-Error "Cron token missing. Use -CronToken or set CRON_BEARER_TOKEN env var."
  exit 1
}

$payload = @{
  tenant_id = $TenantId
  gym_id = $GymId
  difference_threshold = $DifferenceThreshold
  voids_threshold = $VoidsThreshold
  cooldown_minutes = $CooldownMinutes
}

if (-not [string]::IsNullOrWhiteSpace($DateFrom)) { $payload.date_from = $DateFrom }
if (-not [string]::IsNullOrWhiteSpace($DateTo)) { $payload.date_to = $DateTo }
if ($ContactId -gt 0) { $payload.contact_id = $ContactId }
if (-not [string]::IsNullOrWhiteSpace($Phone)) { $payload.phone = $Phone }

$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer $resolvedToken"
  "X-Cron-Token" = $resolvedToken
}

$endpoint = "$($BaseUrl.TrimEnd('/'))/cron/pos/alerts/dispatch"

try {
  $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body ($payload | ConvertTo-Json -Depth 5)
  $response | ConvertTo-Json -Depth 8
} catch {
  Write-Error ("Cron dispatch failed: " + $_.Exception.Message)
  exit 1
}

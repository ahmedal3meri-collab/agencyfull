# Agency PWA — تشغيل على ويندوز
#   .\start.ps1              تشغيل على http://localhost:4173
#   .\start.ps1 -Tailscale   تشغيل + رابط HTTPS للآيفون عبر Tailscale (منفذ 8444)
param(
  [int]$Port = 4173,
  [switch]$Tailscale,
  [int]$HttpsPort = 8444
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js غير مثبت. نزّله من https://nodejs.org ثم أعد التشغيل.' -ForegroundColor Red
  exit 1
}

node scripts/build-data.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Tailscale) {
  if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    Write-Host 'Tailscale غير موجود في PATH.' -ForegroundColor Red
    exit 1
  }
  tailscale serve --bg --https=$HttpsPort "http://localhost:$Port"
  Write-Host ''
  Write-Host 'رابط الآيفون (افتحه في Safari والآيفون متصل بـTailscale):' -ForegroundColor Green
  tailscale serve status
}

$env:PORT = $Port
node server.mjs

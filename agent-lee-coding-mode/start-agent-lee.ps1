$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode"
Set-Location $Root

Write-Host "Starting Agent Lee's Coding Mode..." -ForegroundColor Cyan
docker start leeway-qwen-coders | Out-Null
npm install
npm start

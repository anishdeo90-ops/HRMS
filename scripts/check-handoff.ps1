$root        = "C:\Users\admin\Music\Rabbits-main"
$signalFile  = Join-Path $root ".claude\handoff-signal.txt"
$handoffsDir = Join-Path $root ".claude\handoffs"
$latestFile  = Join-Path $handoffsDir "LATEST.md"

if (-not (Test-Path $signalFile)) { exit 0 }

# Read the prompt written by the current Claude session
$prompt = Get-Content $signalFile -Raw -ErrorAction SilentlyContinue
Remove-Item $signalFile -Force

# Save to timestamped archive + overwrite LATEST
$timestamp   = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$archiveFile = Join-Path $handoffsDir "$timestamp.md"
$prompt | Set-Content $archiveFile -Encoding UTF8
$prompt | Set-Content $latestFile  -Encoding UTF8

# Open new Windows Terminal tab:
#   1. Print the handoff so user can see it
#   2. Pass the handoff prompt directly into claude --continue
$escapedRoot   = $root.Replace("'", "''")
$escapedLatest = $latestFile.Replace("'", "''")

$cmd = @"
Set-Location '$escapedRoot';
Write-Host '========= HANDOFF FROM LAST SESSION =========' -ForegroundColor Cyan;
Get-Content '$escapedLatest';
Write-Host '==============================================' -ForegroundColor Cyan;
`$p = Get-Content '$escapedLatest' -Raw;
claude --continue `$p
"@

wt new-tab pwsh -c $cmd

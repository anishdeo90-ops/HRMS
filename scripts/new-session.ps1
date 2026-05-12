# Manual fallback: open a fresh Claude session in a new Windows Terminal tab
$root = "C:\Users\admin\Music\Rabbits-main"
wt new-tab pwsh -c "Set-Location '$root'; claude"

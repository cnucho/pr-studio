$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

node .\scripts\capture-storyboard.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node .\scripts\render-video.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

node .\scripts\capture-storyboard.mjs
node .\scripts\render-video.mjs

$ErrorActionPreference = 'Stop'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$env:Path = "$userPath;$machinePath"
npm run kg-demo:slides
npm run kg-demo:subtitles
npm run kg-demo:record
npm run kg-demo:render
npm run kg-demo:verify

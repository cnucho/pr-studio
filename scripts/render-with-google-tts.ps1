param(
  [Parameter(Mandatory = $true)]
  [string]$ScriptPath
)

$ErrorActionPreference = "Stop"
$projectId = "0056bba0-35b8-491a-b335-b931d754ce34"
$environmentId = "5546a096-fd0a-4997-bec9-a1174df6f506"
$serviceId = "40caf20a-50bf-463b-ad05-cab69af271ca"

$previousCredential = $env:GOOGLE_SERVICE_ACCOUNT_JSON
$previousProvider = $env:PR_STUDIO_TTS_PROVIDER_KO
$previousResearchProvider = $env:RESEARCH_EXECUTIVE_TTS_PROVIDER
$previousVoice = $env:GOOGLE_TTS_VOICE_KO
$previousRate = $env:GOOGLE_TTS_SPEAKING_RATE

try {
  $rawVariables = railway variable list --json --project $projectId --environment $environmentId --service $serviceId
  if ($LASTEXITCODE -ne 0) {
    throw "Railway variables could not be loaded."
  }

  $variables = $rawVariables | ConvertFrom-Json
  if (-not $variables.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw "GOOGLE_SERVICE_ACCOUNT_JSON is not configured in Railway staging."
  }

  $env:GOOGLE_SERVICE_ACCOUNT_JSON = $variables.GOOGLE_SERVICE_ACCOUNT_JSON
  $env:PR_STUDIO_TTS_PROVIDER_KO = "google"
  $env:RESEARCH_EXECUTIVE_TTS_PROVIDER = "google"
  $env:GOOGLE_TTS_VOICE_KO = "ko-KR-Chirp3-HD-Kore"
  $env:GOOGLE_TTS_SPEAKING_RATE = "0.94"

  node $ScriptPath
  if ($LASTEXITCODE -ne 0) {
    throw "The Google TTS render failed."
  }
}
finally {
  if ($null -eq $previousCredential) { Remove-Item Env:GOOGLE_SERVICE_ACCOUNT_JSON -ErrorAction SilentlyContinue } else { $env:GOOGLE_SERVICE_ACCOUNT_JSON = $previousCredential }
  if ($null -eq $previousProvider) { Remove-Item Env:PR_STUDIO_TTS_PROVIDER_KO -ErrorAction SilentlyContinue } else { $env:PR_STUDIO_TTS_PROVIDER_KO = $previousProvider }
  if ($null -eq $previousVoice) { Remove-Item Env:GOOGLE_TTS_VOICE_KO -ErrorAction SilentlyContinue } else { $env:GOOGLE_TTS_VOICE_KO = $previousVoice }
  if ($null -eq $previousRate) { Remove-Item Env:GOOGLE_TTS_SPEAKING_RATE -ErrorAction SilentlyContinue } else { $env:GOOGLE_TTS_SPEAKING_RATE = $previousRate }
  if ($null -eq $previousResearchProvider) { Remove-Item Env:RESEARCH_EXECUTIVE_TTS_PROVIDER -ErrorAction SilentlyContinue } else { $env:RESEARCH_EXECUTIVE_TTS_PROVIDER = $previousResearchProvider }
  Remove-Variable rawVariables, variables -ErrorAction SilentlyContinue
}

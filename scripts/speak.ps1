param(
  [Parameter(Mandatory = $true)][string]$InputText,
  [Parameter(Mandatory = $true)][string]$OutputWav,
  [string]$Voice = "Microsoft Heami Desktop",
  [int]$Rate = -1
)

Add-Type -AssemblyName System.Speech

$text = Get-Content -LiteralPath $InputText -Raw -Encoding UTF8
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($Voice)
$synth.Rate = $Rate
$synth.Volume = 96
$synth.SetOutputToWaveFile($OutputWav)
$synth.Speak($text)
$synth.Dispose()

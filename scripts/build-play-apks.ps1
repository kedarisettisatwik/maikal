param([switch]$SkipWebBuild)
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not $env:JAVA_HOME) { $env:JAVA_HOME=(Resolve-Path '.publish/android-tools/jdk21/jdk-21.0.13+9').Path }
$env:PATH="$env:JAVA_HOME/bin;$env:PATH"
$signingFolder=Join-Path (Resolve-Path '.publish').Path 'mantra-play-signing'
$env:MANTRA_UPLOAD_STORE=Join-Path $signingFolder 'mantra-upload.p12'
if (-not (Test-Path -LiteralPath $env:MANTRA_UPLOAD_STORE)) { throw 'Existing upload key missing. Restore it; do not generate a replacement for an existing Play app.' }
$protectedPassword=(Get-Content -Raw -LiteralPath (Join-Path $signingFolder 'upload-password.dpapi')).Trim() | ConvertTo-SecureString
$env:MANTRA_UPLOAD_PASSWORD=[System.Net.NetworkCredential]::new('', $protectedPassword).Password
try {
 if (-not $SkipWebBuild) { node scripts/build-android.mjs; if($LASTEXITCODE -ne 0){throw 'Web assets failed'} }
 Push-Location APK/android
 try { ./gradlew.bat :app:lintLocalRelease :app:lintFirebaseRelease :app:testLocalDebugUnitTest :app:testFirebaseDebugUnitTest :app:bundleLocalRelease :app:bundleFirebaseRelease :app:assembleLocalRelease :app:assembleFirebaseRelease :app:assembleLocalDebug :app:assembleFirebaseDebug --console=plain; if($LASTEXITCODE -ne 0){throw 'Release checks/build failed'} } finally { Pop-Location }
} finally { Remove-Item Env:MANTRA_UPLOAD_PASSWORD -ErrorAction SilentlyContinue }

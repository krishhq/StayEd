$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot'
$env:ANDROID_HOME = 'D:\AS'
$env:Path = $env:JAVA_HOME + '\bin;' + $env:ANDROID_HOME + '\platform-tools;' + $env:Path
Write-Host "Using Java from: $env:JAVA_HOME"
java -version

Set-Location "android"
Write-Host "Cleaning previous builds..."
$clean = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "clean" -Wait -NoNewWindow -PassThru
if ($clean.ExitCode -ne 0) { Write-Error "Clean failed!"; exit 1 }

Write-Host "Building Release APK..."
$build = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "assembleRelease" -Wait -NoNewWindow -PassThru
if ($build.ExitCode -ne 0) { Write-Error "Build failed!"; exit 1 }

Write-Host "Build Complete!"
Write-Host "APK should be at: android\app\build\outputs\apk\release\app-release.apk"


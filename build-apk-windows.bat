@echo off
setlocal EnableExtensions
set "PROJECT_DIR=%~dp0"

if not defined JAVA_HOME if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined ANDROID_SDK_ROOT if defined ANDROID_HOME set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

if not defined JAVA_HOME (
  echo ERROR: JDK 17 not found. Install Android Studio or set JAVA_HOME to a JDK 17 folder.
  pause
  exit /b 1
)
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERROR: JAVA_HOME does not point to a JDK/JRE folder: %JAVA_HOME%
  pause
  exit /b 1
)
if not defined ANDROID_HOME (
  echo ERROR: Android SDK not found. Install Android SDK Platform 34 and Build Tools from Android Studio SDK Manager.
  pause
  exit /b 1
)
if not exist "%ANDROID_HOME%\platforms\android-34\android.jar" (
  echo ERROR: Android SDK Platform 34 is missing. Install it in Android Studio ^> SDK Manager ^> SDK Platforms.
  pause
  exit /b 1
)

where gradle >nul 2>nul
if not errorlevel 1 (
  set "GRADLE_CMD=gradle"
) else (
  set "GRADLE_HOME_LOCAL=%LOCALAPPDATA%\CineMorphAI\gradle-8.7"
  if not exist "%GRADLE_HOME_LOCAL%\bin\gradle.bat" (
    echo Downloading Gradle 8.7. Internet access is required the first time...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $d=Join-Path $env:LOCALAPPDATA 'CineMorphAI'; New-Item -ItemType Directory -Force -Path $d | Out-Null; $z=Join-Path $d 'gradle-8.7-bin.zip'; Invoke-WebRequest 'https://services.gradle.org/distributions/gradle-8.7-bin.zip' -OutFile $z; Expand-Archive -Path $z -DestinationPath $d -Force; Remove-Item $z -Force"
    if errorlevel 1 (
      echo ERROR: Gradle download failed. Check internet access or install Gradle 8.7 manually.
      pause
      exit /b 1
    )
  )
  set "GRADLE_CMD=%GRADLE_HOME_LOCAL%\bin\gradle.bat"
)

cd /d "%PROJECT_DIR%"
echo Building CineMorph AI debug APK. Gradle may download Android dependencies on first run...
call "%GRADLE_CMD%" --no-daemon assembleDebug
if errorlevel 1 (
  echo.
  echo BUILD FAILED. Copy the full error above so it can be diagnosed; do not assume an APK was created.
  pause
  exit /b 1
)
echo.
echo BUILD SUCCESS. APK location:
echo %PROJECT_DIR%app\build\outputs\apk\debug\app-debug.apk
pause

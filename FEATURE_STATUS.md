# CineMorph AI — feature status

This status describes the source code in this package; it is not a claim that an APK was built or device-tested.

## Native Android source implemented
- Local video picker, Android “Open with”, Media3 playback, resume position, recent history.
- Speed control, Fit/Stretch/Zoom, double-tap skip, seek/brightness/volume gestures.
- SRT/VTT subtitle overlay, support for timestamps with or without an hours field, saved subtitle size/high-contrast preferences, ±500 ms controls with a recalibration indicator, app-private offline subtitle cache.
- Voice playback commands, recent dubbing-language preference, genre-based player theme selector.
- Native Android: Firestore-backed Co-Watch room state/chat and Firestore watch progress, using the named database in the supplied web app config.
- React web companion: Firebase Realtime Database room state/chat with authenticated host room writes and authenticated chat messages; configure `VITE_FIREBASE_DATABASE_URL` and deploy `database.rules.json`.
- React web companion: IndexedDB cache for movie metadata and subtitle timelines, and a rendered `HistoryView` backed by Firestore watch progress.
- Subtitle timeline keyword search and optional Gemini-backed search route.
- Current-subtitle transcreation request, Android TTS preview, and dubbing progress status when the AI backend is configured.

## Requires service setup
- Co-Watch / cloud history: verify the named Firestore database exists, enable Anonymous Authentication, and deploy `web-companion/firestore.rules` to that exact database.
- Gemini semantic search and dialogue transcreation: run/deploy `web-companion/server.ts`; put `GEMINI_API_KEY` only in the server-side `.env`; set the backend base URL in the Android player.
- Device speech recognition and TTS language voices depend on the Android device and its installed services.

## Not fully implemented / not verified
- The React/Vite web companion source is preserved in `web-companion/`, but it is not bundled as a screen inside the native Android app. Its Realtime Database integration needs a real database URL and deployed rules before it can connect.
- The dubbing lab translates a subtitle line and speaks it as a demo; it does not replace/synchronize the entire movie audio track in real time.
- Gemini scene search chooses among loaded subtitle cues; it does not analyze video frames or locate visual events absent from subtitles.
- The project was syntax/static-checked, but a full Android Gradle build and real-device test were not possible in the generation environment because Android SDK/Gradle were unavailable. Run `build-apk-windows.bat` on a Windows PC with JDK 17 and Android SDK Platform 34 to attempt the build; treat the APK as unverified until it succeeds and is tested on-device.

## Deployment-readiness work (2026-10-29)
- Added `web-companion/Dockerfile`, `entrypoint.sh`, `.dockerignore`, and root `render.yaml` for a Docker-based Render deployment.
- Added `/api/health` and a lightweight per-process AI endpoint request limit (20 requests/IP/minute; not a replacement for a shared production limiter).
- Added runtime Firebase Realtime Database URL injection so Render runtime environment configuration can be used without rebuilding the frontend bundle.
- Changed Android cleartext HTTP to debug-only; release manifest defaults to HTTPS-only.
- Added GitHub Actions validation workflow for web build and Android debug APK build.
- Added Telugu deployment guide `DEPLOYMENT_TELUGU.md`.
- Verified TypeScript/TSX syntax transpilation (26 files), JSON parsing, XML parsing, shell syntax, and YAML parsing.
- Still unverified: dependency installation, full TypeScript type-check, Vite production build, Docker image build, Android Gradle APK build, Firebase live configuration, and real-device tests. Network/package installation and Android SDK/Docker are unavailable in the current environment.

## 2026-10-30: Automatic on-device video library
- Replaced the single-action landing screen with an Android MediaStore-backed local video library.
- Requests READ_MEDIA_VIDEO on Android 13+ and READ_EXTERNAL_STORAGE on Android 12L and below; access is limited to videos and remains on-device.
- Lists video title, containing folder (where Android exposes RELATIVE_PATH), duration, and file size; supports search and All videos / Folders / Recent / Large filters.
- Tapping a video launches the existing PlayerActivity; manual document picker remains available.
- Permission denial is handled with an explanation and retry button.
- Not device-tested or APK-built in this environment. OEM storage visibility, Android permission behavior, and playback must be verified on a physical phone.

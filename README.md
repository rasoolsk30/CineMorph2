# CineMorph AI — Android Player + Web AI Companion

This package combines the native CineLingo Android player baseline with the CineFluent/CineMorph React AI companion source in `web-companion/`.

## Android app

On Windows, run `build-apk-windows.bat` to build a debug APK (requires JDK 17, Android SDK Platform 34, and internet access for the first dependency download), or open the **CineMorphAI-Android** folder in Android Studio, allow Gradle sync, then run the `app` configuration on an Android device (Android 7.0 / API 24 or newer).

### Implemented in the native player
- Local video picker and Android “Open with” video intent.
- Media3/ExoPlayer playback, resume position and last-10 local watch history.
- Double-tap ±10 seconds; horizontal seek; vertical brightness/volume gestures.
- Playback speed and Fit/Stretch/Zoom.
- External `.srt` / `.vtt` subtitle loading with a custom overlay, internal offline subtitle cache, saved size/high-contrast preferences, and ±500 ms timing adjustment (up to ±10 seconds) with a recalibration indicator.
- Voice commands through Android SpeechRecognizer: play, pause, rewind/forward N seconds, volume up/down, mute, find scene, and select a dubbing language.
- Language selector with a locally stored recent-language list.
- Voice AI Lab can transcreate the currently visible subtitle through the configured backend and speak the result with Android TextToSpeech, with a dubbing progress indicator; sample preview is also available. This does not replace the entire movie audio track in real time.
- Scene search supports direct timestamps, actual loaded-subtitle keyword matching, and an optional Gemini-backed timeline matcher via the included `/api/ai/search-scene` server route. The server key stays server-side; configure the backend base URL in the player’s **AI server** setting. For a local Windows test, run `web-companion/run-local-backend.bat`, then enter `http://YOUR-PC-LAN-IP:3000` in the player while the phone and PC are on the same Wi-Fi. HTTP is enabled for this local-development workflow only; use HTTPS for public deployment.
- Native Android Co-Watch sync/live chat and watch-progress history use the configured Firestore database. The React web companion Co-Watch room sync/live chat uses Firebase Realtime Database; its database URL must be configured separately. Firebase Anonymous Authentication and the matching database rules must be enabled/deployed.

## Firebase setup (Co-Watch + watch history)

The native Android app uses the supplied Firebase project configuration and named Firestore database. The React web companion now uses Firebase Realtime Database for Co-Watch rooms/chat, while Firestore remains the watch-history store.

1. Open Firebase Console for project `celtic-sunspot-23kqt` and verify that the configured named Firestore database exists.
2. Enable **Authentication → Sign-in method → Anonymous**.
3. Deploy `web-companion/firestore.rules` to the exact database ID in `FIRESTORE_DATABASE_ID` in `gradle.properties`.
4. In Firebase Console, create/enable Realtime Database and copy its exact URL into `web-companion/.env` as `VITE_FIREBASE_DATABASE_URL`. Deploy the root `database.rules.json` to that Realtime Database.
5. Sync and rebuild the Android project. If the database ID or project differs from your Firebase Console, replace the values in `gradle.properties` with your actual values.

The included Firestore and Realtime Database rules should be reviewed before public deployment. Co-Watch sync is best-effort and is not a low-latency streaming protocol; both users must have the same movie file available locally.

## Start the local AI backend on Windows

1. Install Node.js 20 or newer.
2. Open `web-companion/run-local-backend.bat` (it installs npm dependencies on first run).
3. To enable Gemini responses, add your own `GEMINI_API_KEY` to `web-companion/.env`. Without it, the scene endpoint still offers subtitle-keyword fallback matching.
4. Find the PC's LAN IPv4 address with `ipconfig`; on the phone, enter `http://PC-IP:3000` in **AI server** settings. Keep both devices on the same trusted Wi-Fi. Windows Firewall may ask permission for Node.js.
5. Do not expose this development server to the public internet. The manifest currently permits cleartext HTTP to support this local-development workflow; do not use that setting for public production builds. For public use, deploy behind HTTPS and disable cleartext HTTP.

## Web AI companion source

`web-companion/` preserves the supplied React/Vite project and its CinemaPlayer, Web Speech voice-control, Gemini-backed subtitle timeline scene search, AI Studio dubbing mock, IndexedDB subtitle/metadata cache, HistoryView/Firestore watch progress, and Firebase Realtime Database Co-Watch UI source. It is included as source; it is **not yet bundled into the native Android runtime**. Its Gemini API routes require a server-side `GEMINI_API_KEY` configured outside the client. Never hardcode that key into Android or browser code.

## Important limitations (not misrepresented as complete)
- No APK is included because this environment has no Android SDK or Gradle installation, so an Android Gradle build/device test could not be executed here. Open the project in Android Studio, let Gradle sync resolve dependencies, then build the APK.
- Voice recognition availability and supported languages depend on the device's speech-recognition service and microphone permission.
- Gemini semantic search is optional and needs the supplied server deployed with `GEMINI_API_KEY` set server-side; the app also has a real subtitle-keyword fallback. The Gemini endpoint selects only from the loaded subtitle timeline and cannot infer visual events that are not represented in subtitles.
- The dubbing feature is a TTS demo. Real-time movie dubbing requires speech separation/transcription, translation, synthesis, buffering and synchronization services; those are not supplied by the two source ZIPs.
- Co-Watch and Firestore watch history need the named Firestore database, Anonymous Auth, and deployed rules. Sync is best-effort and not a production-grade low-latency streaming protocol.
- Offline video playback works for local files supported by Media3; subtitle text is cached in app-private files and local watch history is retained. IndexedDB itself is a browser API, so the native Android player uses app-private storage instead.

## Source layout
- `app/` — Android Kotlin source and resources.
- `web-companion/` — original React/Vite AI app source.
- `web-companion/firestore.rules` — Firestore security rules for watch progress and native Co-Watch.
- `database.rules.json` — starter Firebase Realtime Database rules for web Co-Watch room state and chat.


## Deployment

See [`DEPLOYMENT_TELUGU.md`](DEPLOYMENT_TELUGU.md) for the step-by-step Telugu launch checklist. The repo includes a Dockerfile, Render Blueprint, `/api/health` endpoint, runtime Firebase Realtime Database URL injection, a lightweight per-process AI request limit, and debug-only Android cleartext HTTP. These files prepare deployment but do not deploy to a user account automatically.


## Android full web companion integration
The native home screen includes **Open Full AI Studio (web features)**. After deploying `web-companion/` to an HTTPS URL and configuring the backend/Firebase, enter that URL in the Android app to open the React companion inside a secure WebView. This is online hybrid integration, not an offline bundled website. See `ANDROID_FEATURE_AUDIT_TELUGU.md`.

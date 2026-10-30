# CineMorph AI — Live చేయడానికి గైడ్ (తెలుగు)

ఈ రిపాజిటరీలో రెండు వేర్వేరు యాప్‌లు ఉన్నాయి: `web-companion/` లో వెబ్ యాప్ + AI backend, `app/` లో native Android player. ఒకటి live అయితే మరొకటి ఆటోమేటిక్‌గా live కాదు.

## 1. వెబ్ యాప్‌ను public URLలో పెట్టడం

ఈ ప్రాజెక్ట్ కోసం Docker ఆధారిత Render web service config (`render.yaml`) మరియు `web-companion/Dockerfile` సిద్ధం చేశాం.

1. మొత్తం `CineMorphAI-Android` ఫోల్డర్‌ను నీ GitHub repositoryకి upload/push చేయాలి.
2. Renderలో **New → Blueprint** ద్వారా ఆ repositoryని connect చేసి `render.yaml`ను deploy చేయాలి. లేదా Web Serviceగా Dockerfile `web-companion/Dockerfile`, Docker context `web-companion` ఎంచుకోవాలి.
3. Render Environmentలో ఈ values ఇవ్వాలి:
   - `GEMINI_API_KEY` = నీ Gemini API key (ఇది server-side secret; browser లేదా Android codeలో పెట్టకూడదు).
   - `VITE_FIREBASE_DATABASE_URL` = Firebase Consoleలో Realtime Database చూపించే ఖచ్చితమైన URL.
4. Deploy అయ్యాక Render ఇచ్చిన `https://...onrender.com/api/health` URL ఓపెన్ చేయాలి. `{"status":"ok"...}` వస్తే web server health endpoint స్పందిస్తోంది.
5. అదే base URLను browserలో ఓపెన్ చేసి UI load అవుతుందో పరీక్షించాలి.

**గమనిక:** `render.yaml` స్వయంగా నీ Render accountలో deploy చేయదు. GitHub/Render login, project selection, secrets ఇవ్వడం account owner చేయాల్సిన పని. ఈ environmentకి నీ accounts access లేదు.

## 2. Firebase అవసరాలు

- Firebase Consoleలో సరైన projectలో **Authentication → Sign-in method → Anonymous** enable చేయాలి.
- వెబ్ Co-Watch కోసం Realtime Database create/enable చేసి, `database.rules.json` rules review చేసి deploy చేయాలి.
- Watch history / native Android Co-Watch కోసం `web-companion/firestore.rules`ను READMEలోని database IDకి deploy చేయాలి.
- Rules deploy చేయకముందు production data access rules review చేయాలి. Demo/test mode rulesతో publicగా వదలకూడదు.

## 3. Android APK తయారు చేయడం

1. Windowsలో Android Studioలో ఈ ఫోల్డర్‌ను open చేయాలి.
2. SDK Managerలో Android SDK Platform 34, Build Tools 34.0.0 install అయ్యాయో చూడాలి.
3. Gradle Sync పూర్తి చేయాలి.
4. `Build → Build Bundle(s) / APK(s) → Build APK(s)` నొక్కాలి. లేదా project rootలో `build-apk-windows.bat` run చేయాలి.
5. విజయవంతమైతే APK సాధారణంగా `app/build/outputs/apk/debug/app-debug.apk`లో ఉంటుంది.
6. ఆ APKని ఫోన్‌లో install చేసి, video, subtitles, gestures, voice, historyని పరీక్షించాలి.

Debug buildలో మాత్రమే local HTTP backend అనుమతించబడుతుంది. Release buildలో HTTPS backend URL వాడాలి.

## 4. ఇప్పటి నిజమైన స్థితి

- Source code ఉంది; deployment files, health endpoint, AI API rate-limit guard, debug-only HTTP exception జోడించబడ్డాయి.
- TypeScript/TSX syntax transpile check, JSON/XML parse checks pass అయ్యాయి.
- Dependencies ఈ environmentలో install కాలేదు (npm install timeout); అందువల్ల Vite production build, full type-check, Docker image build ఇక్కడ pass అయ్యాయని చెప్పలేం.
- Android SDK/Gradle installation లేకపోవడంతో APK build/device test ఇంకా చేయలేదు.
- AI dubbing ఇప్పటికీ subtitle transcreation + TTS preview మాత్రమే; పూర్తి movie audio real-time dubbing కాదు.

## 5. Releaseకి ముందు తప్పనిసరిగా పరీక్షించాలి

- [ ] Web production build pass
- [ ] `/api/health` 200 response
- [ ] Gemini key server-side envలో మాత్రమే ఉంది
- [ ] Firebase Auth, RTDB, Firestore rules verified
- [ ] Co-Watch create/join/chat రెండు browser/deviceలలో test
- [ ] Android debug APK build + install + playback test
- [ ] Release APK HTTPSతో test; cleartext HTTP off
- [ ] Crash logs, AI usage/quota alerts, privacy notice, copyright/film-content policy review

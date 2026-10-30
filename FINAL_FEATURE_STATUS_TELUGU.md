# CineMorph AI — Final source feature status

ఈ package source-code delivery. Android APK build / Vivo V40 real-device test ఈ environmentలో చేయలేకపోయాం (Android SDK/Gradle wrapper లేవు). అందువల్ల device-tested అని చెప్పడం లేదు.

## Sourceలో ఉన్నవి / ఈ batchలో జోడించినవి
- Video library: search, Date/Name/Size sort, resume position label.
- Playback speed: top speed button + speed picker ఒకే state ద్వారా synchronize.
- Same-folder previous/next + video ముగిసినప్పుడు next autoplay (app library నుంచి player తెరిచినప్పుడు).
- Embedded audio track selection.
- External SRT/VTT load, offline subtitle cache, ±500ms sync, size/color/background style.
- Subtitle lineలో tap చేసి పదాన్ని ఎంచుకుంటే backend word-definition lookup.
- SRT/VTT translation to selected language; translated file save prompt.
- Double tap seek ±10 seconds; screen lock overlay.
- Android PiP entry button and PiP lifecycle UI handling.
- CineMorph vector launcher icon and app label.

## పనిచేయడానికి backend / configuration అవసరం
- SRT translation, word meaning, semantic scene search, subtitle transcreation preview: deployed CineMorph web backend URL ఇవ్వాలి; serverలో GEMINI_API_KEY configure చేయాలి.
- AI dub preview ప్రస్తుతం subtitle-line translation + Android TextToSpeech మాత్రమే. Full movie audio dubbing / replacement track కాదు.
- Co-Watch కోసం Firebase configuration అవసరం.

## ఇంకా పూర్తి కాలేదు — ఈ ZIPలో పూర్తయిందని భావించవద్దు
- Background audio playback service (MediaSessionService).
- Movie audio నుంచి automatic subtitle transcription.
- Full-length AI dubbing with generated audio track and timing/lip-sync.
- Picture upscaling / super-resolution.
- Subtitle word selection currently opens a word picker; direct inline word-by-word clickable spans are not implemented.

## Validation
- AndroidManifest.xml, activity_player.xml, ic_cinemorph.xml XML parse passed.
- Gradle/APK build not run: Android SDK and Gradle executable/wrapper unavailable in build environment.
- Vivo V40 Android 16 playback / PiP / permission testing not run.


## 2026-10-30 — First delivery batch source changes

- Native Cinema Studio landing screen added as a separate Android Activity. It can open the deployed HTTPS web companion or select a local video for the native player. The web companion still requires a deployed URL; video editing tools are intentionally deferred to the next batch.
- Local Favorites collection added to the library. Videos can be saved/removed with the star control and filtered from the Collection tab.
- Local watch history screen added, reading the existing player history records and reopening a selected item. Tapping a history item invokes the existing Smart Resume / Start Over flow.
- Premium dark cinema theme made consistent even when the Android system is in light mode.
- Smart Resume persistence adjusted so a completed video is not written back as resumable after playback ends.
- Audio track picker and Media3 decoder fallback were already present in the branch. Decoder fallback is not a guarantee that every unsupported codec will play; no bundled software decoder was added.
- Subtitle buttons and two-step screen-lock logic were not changed in this batch.
- Build and physical-device verification remain outstanding. Do not treat source edits as a tested APK.

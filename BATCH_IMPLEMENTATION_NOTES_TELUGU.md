# CineMorph AI — ఈ ZIPలో చేసిన మార్పులు

- Libraryలో Date / Name / Size sort, resume position label (ఇవి base projectలో ముందే ఉన్నాయి; అలాగే ఉంచాం).
- Speed top button మరియు Speed picker ఒకే function/state ద్వారా పనిచేస్తాయి.
- Main library నుంచి తెరిచినప్పుడు అదే folder playlist పంపబడుతుంది; Previous / Next మరియు end-of-video autoplay జోడించాం.
- Subtitle size, color (White/Yellow/Cyan/Green), dark background ఎంపికలు.
- Screen lock overlay మరియు PiP button/lifecycle handling.
- Subtitle tap → word picker → `/api/ai/word-definition` backend integration.
- Full SRT/VTT translation endpoint `/api/ai/translate-subtitles`; Androidలో translated file save prompt.
- Custom CineMorph vector icon, PiP manifest capability.

## పరిమితులు / నిజాయితీగా చెప్పాల్సినవి
- Background playback service ఇంకా లేదు; Activity stop అయినప్పుడు player pause అవుతుంది.
- Auto subtitle transcription, full movie AI dubbing, upscaling ఇంకా implement కాలేదు.
- AI backend URL + server GEMINI_API_KEY లేకపోతే translation/word lookup పనిచేయవు.
- Android SDK/Gradle ఈ environmentలో లేవు కాబట్టి APK build చేయలేదు; Vivo V40లో test చేయలేదు.

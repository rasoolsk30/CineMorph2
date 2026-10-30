# Audio language switching fix (Telugu)

Player screenలో `Audio track` అనే కొత్త control చేర్చబడింది. ఇది AndroidX Media3 ExoPlayer `DefaultTrackSelector` ద్వారా ప్రస్తుతం తెరిచిన వీడియోలో ఉన్న audio tracks జాబితాను చూపిస్తుంది. Telugu / Tamil / Hindi / English వంటి track అందుబాటులో ఉంటే దాన్ని ఎంచుకుని playback audio మార్చవచ్చు. `System default` ఎంచుకుంటే player default selectionకు తిరిగి వెళ్తుంది.

## పరిమితులు
- ఈ మార్పు ఒకే video file/container లో multiple embedded audio tracks ఉన్నప్పుడు పనిచేస్తుంది.
- వేరే website/server నుంచి విడిగా stream అయ్యే dubbed audio లేదా audio file ఈ control ద్వారా ఆటోమేటిక్‌గా కనిపించదు.
- వీడియోలో నిజంగా ఒకే audio track ఉంటే భాష మార్చడానికి track ఉండదు.
- Android build/APK మరియు Vivo device playback పరీక్ష ఇంకా చేయలేదు; Gradle/Android SDK ఉన్న వాతావరణంలో build చేసి multi-audio sample fileతో పరీక్షించాలి.

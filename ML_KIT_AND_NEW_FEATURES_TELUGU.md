# కొత్తగా చేర్చినవి (source only, build/test అవసరం)
- Offline Translate SRT (ML Kit): AI server URL లేకపోతే "Translate SRT" ఫోన్‌లోనే అనువదిస్తుంది (మొదటిసారి language model download, internet కావాలి). Malayalam ML Kit లో లేదు.
- Subtitle లో ప్రతి పదం tap చేయవచ్చు: meaning (AI server ఉంటే Gemini, లేకపోతే offline translation).
- Auto dub: subtitle ప్రతి లైన్‌ను అనువదించి TTS తో చదువుతుంది, అసలు ఆడియో volume తగ్గుతుంది. (ఇది full movie dubbing కాదు; timing exact కాదు; ఫోన్‌లో ఆ భాష TTS voice ఉండాలి.)
- Boost: contrast/saturation మాత్రమే (AI upscaling కాదు).
## ఇంకా లేవు
- Audio నుంచి automatic subtitles (Whisper/Vosk), background audio service, నిజమైన AI upscaling, full dubbing.

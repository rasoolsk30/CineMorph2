import { MovieScene, DubbingMoodPreset } from '../types';

export const DUBBING_MOODS: DubbingMoodPreset[] = [
  {
    id: 'dramatic',
    name: 'Dramatic',
    tagline: 'Intense, deep cinematic gravitas',
    pitchMultiplier: 0.88,
    rateMultiplier: 0.96,
    description: 'Deepened baritone timbre with theatrical emotional pauses, heavy chest resonance, and dramatic tension.',
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
  },
  {
    id: 'comedic',
    name: 'Comedic',
    tagline: 'High-energy, witty & punchy',
    pitchMultiplier: 1.25,
    rateMultiplier: 1.18,
    description: 'Elevated vocal pitch with playful cadence, rapid comedic timing, and exaggerated punchline emphasis.',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
  },
  {
    id: 'documentary',
    name: 'Documentary',
    tagline: 'Calm, authoritative narrator',
    pitchMultiplier: 0.96,
    rateMultiplier: 0.90,
    description: 'Measured, articulate, neutral-pitch voice with studio acoustics reminiscent of classic NatGeo or BBC documentaries.',
    badgeColor: 'border-blue-500/40 text-blue-300 bg-blue-500/10'
  },
  {
    id: 'action',
    name: 'Action & Rush',
    tagline: 'Aggressive, adrenaline-fueled bursts',
    pitchMultiplier: 1.10,
    rateMultiplier: 1.22,
    description: 'Rapid-fire staccato delivery with sudden vocal strain spikes matching high-octane chases and firefights.',
    badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-500/10'
  },
  {
    id: 'noir',
    name: 'Noir Whisper',
    tagline: 'Low, breathy detective monologue',
    pitchMultiplier: 0.76,
    rateMultiplier: 0.84,
    description: 'Subtle raspy whisper with near-microphone intimacy, ideal for rainy neon mystery crime scenes.',
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10'
  }
];

export const SUPPORTED_LANGUAGES: Array<{ code: any; name: string; native: string; flag: string }> = [
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { code: 'en', name: 'English (US)', native: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
];

import { VoicePersona } from '../types';

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'thunder_baritone',
    name: 'The Thunder Baritone',
    celebrityInspiration: 'Amitabh Bachchan / Morgan Freeman',
    tagline: 'Deep, resonant, supreme theatrical authority',
    pitch: 0.70,
    rate: 0.88,
    vocalFry: 70,
    warmth: 92,
    badge: 'Legendary Authority',
    description: 'Sub-bass chest acoustic frequency with stately, commanding pauses that bring colossal gravitas to thrillers and historical epics.',
    sampleLine: 'ఇక్కడి నుంచి ప్రాణాలతో బయటపడతా అనుకోకు... నీ పని అయిపోయిందిరా!'
  },
  {
    id: 'gritty_detective',
    name: 'The Gritty Detective',
    celebrityInspiration: 'Venkatesh / Christian Bale / Liam Neeson',
    tagline: 'Gravelly, raspy, world-weary intensity',
    pitch: 0.82,
    rate: 0.94,
    vocalFry: 85,
    warmth: 65,
    badge: 'Noir Tension',
    description: 'A textured, hoarse whisper with sharp plosives designed for neo-noir detectives, interrogations, and revenge thrillers.',
    sampleLine: 'నిన్ను నా సొంత ప్రాణ స్నేహితుడు అనుకున్నా కదరా... నాకే సున్నం పెడతావా?!'
  },
  {
    id: 'charming_rogue',
    name: 'The Charming Rogue',
    celebrityInspiration: 'Allu Arjun / Ryan Reynolds / Robert Downey Jr.',
    tagline: 'High-speed, witty banter with punchy charisma',
    pitch: 1.15,
    rate: 1.18,
    vocalFry: 35,
    warmth: 80,
    badge: 'Mass & Swag',
    description: 'Rapid-fire staccato rhythm with playful tonal inflections, perfect for heist banter, superhero one-liners, and comedic action.',
    sampleLine: 'ఒరేయ్ విను! పోలీసులు దూసుకురావడానికి ముప్పై సెకన్లు మాత్రమే ఉంది... తలుపు పగలగొట్టు త్వరగా!'
  },
  {
    id: 'regal_matriarch',
    name: 'The Regal Matriarch',
    celebrityInspiration: 'Ramya Krishna (Sivagami) / Cate Blanchett',
    tagline: 'Aristocratic, razor-sharp theatrical presence',
    pitch: 0.94,
    rate: 0.90,
    vocalFry: 45,
    warmth: 88,
    badge: 'Regal Majesty',
    description: 'Crisp enunciation with sweeping tonal range and piercing emphasis that commands absolute room silence.',
    sampleLine: 'ఈ రాజ్యంలో ప్రతి నిర్ణయం... నా మాటే శాసనం!'
  },
  {
    id: 'cyber_rebel',
    name: 'The Cyber Rebel',
    celebrityInspiration: 'Timothée Chalamet / Vijay Deverakonda',
    tagline: 'Raw, emotional, breathless vulnerability',
    pitch: 1.05,
    rate: 1.06,
    vocalFry: 50,
    warmth: 70,
    badge: 'Raw Passion',
    description: 'A breathless, passionate youthful tone with intimate micro-pauses suited for cyberpunk anime and romantic intensity.',
    sampleLine: 'ఆ జ్ఞాపకాలు కంప్యూటర్ రాసినవే అయినా... నీ గుండెల్లో రగులుతున్న ఈ నొప్పి మాత్రం నిజమైనది.'
  }
];

export const MOVIE_SAMPLES: MovieScene[] = [
  {
    id: 'korean-noir',
    title: 'Shadows of Incheon (인천의 그림자)',
    titleEnglish: 'Shadows of Incheon (Korean Neo-Noir)',
    originalLanguage: 'Korean',
    genre: 'Neo-Noir Crime Thriller',
    duration: 35,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    fallbackPosterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    synopsisEnglish: 'On a rain-soaked neon night in Incheon port, a double-crossed detective corners an underworld lieutenant. Instead of looking down at subtitles, hear the actor’s raw vocal fury dubbed in real-time in your mother tongue while keeping the 5.1 Dolby score pristine.',
    directorVisualNotes: 'Anamorphic 35mm lens, high neon reflections, deep shadows. Toggle Night Scene Radiance to recover fine details from deep shadowy backgrounds.',
    originalAudioScore: 'Dark Synthwave & Heavy Rain Foley (Dolby Atmos 5.1 preserved)',
    defaultActionDescription: 'Detective Kim steps from the shadows of a rusted sea container, water streaming down his brimmed collar as his gaze fixes on Park crouching beside the generator.',
    dialogues: [
      {
        id: 'k-1',
        startTime: 2,
        endTime: 6,
        speaker: 'Detective Kim (김 형사)',
        originalText: '이곳에서 살아 나갈 생각 마라. 넌 이미 끝났어.',
        originalLang: 'Korean',
        teluguColloquial: 'ఇక్కడి నుంచి ప్రాణాలతో బయటపడతా అనుకోకు! నీ పని అయిపోయిందిరా!',
        teluguTransliteration: 'Ikkadi nunchi pranalatho bayatapadata anukoku! Nee pani aipoyindira!',
        englishLiteral: "Don't think you'll leave here alive. You are already finished.",
        culturalSlangExplanation: 'In Korean crime cinema, "넌 이미 끝났어" is a classic fatalistic underworld ultimatum. It is transcreated into a punchy local threat with intense bass resonance.',
        emotion: 'angry',
        vocalPitch: 0.9,
        vocalRate: 1.05,
        soundCue: '[♪ Heavy rain pattering on metal, low ominous brass drone]'
      },
      {
        id: 'k-2',
        startTime: 8,
        endTime: 13,
        speaker: 'Park (박 부హ)',
        originalText: '형님, 제발... 저를 믿어주십시오. 전 배신하지 않았습니다!',
        originalLang: 'Korean',
        teluguColloquial: 'అన్నా! దండం పెడతా నన్ను నమ్ము... నేను నీకు వెన్నుపోటు పొడవలేదు!',
        teluguTransliteration: 'Anna! Dandam pedatha nannu nammu... Nenu neeku vennupotu podavaledu!',
        englishLiteral: "Hyung-nim, please... trust me. I did not betray you!",
        culturalSlangExplanation: '"Hyung-nim" (형님) denotes supreme respect to an elder crime syndicate boss. The dubbing preserves the desperate cracking tremolo of fear.',
        emotion: 'desperate',
        vocalPitch: 1.15,
        vocalRate: 1.1,
        soundCue: '[Trembling breath, distant port foghorn blowing]'
      },
      {
        id: 'k-3',
        startTime: 15,
        endTime: 21,
        speaker: 'Detective Kim (김 형사)',
        originalText: '피를 나눈 깐부라 믿었는데... 내 뒤통수를 쳐?',
        originalLang: 'Korean',
        teluguColloquial: 'నిన్ను నా సొంత ప్రాణ స్నేహితుడు గన్బు అనుకున్నా కదరా... నాకే సున్నం పెడతావా?!',
        teluguTransliteration: 'Ninnu na sontha praana snehitudu gganbu anukunna kadara... Naake sunnam pedathava?!',
        englishLiteral: "I thought you were my blood brother Gganbu... and you stab my back?",
        culturalSlangExplanation: '"깐부 (Gganbu)" is the Korean term for sacred childhood marble-sharing allies made famous by Squid Game. It denotes absolute trust.',
        emotion: 'tense',
        vocalPitch: 0.85,
        vocalRate: 0.95,
        soundCue: '[Tense violin swell, metal footstep on wet asphalt]'
      },
      {
        id: 'k-4',
        startTime: 23,
        endTime: 29,
        speaker: 'Park (박 부హ)',
        originalText: '그 돈 없이는 내 가족이 다 죽는단 말입니다!',
        originalLang: 'Korean',
        teluguColloquial: 'ఆ డబ్బులు లేకపోతే నా భార్యాబిడ్డలు రోడ్డున పడి చచ్చిపోతారు బాస్!',
        teluguTransliteration: 'Aa dabbulu lekapothe na bharya-biddalu rodduna padi chachipotharu boss!',
        englishLiteral: "Without that money, my entire family will die!",
        culturalSlangExplanation: 'A heart-wrenching emotional defense delivered with high sorrow and pleading tears.',
        emotion: 'sorrow',
        vocalPitch: 1.1,
        vocalRate: 1.0,
        soundCue: '[Choked sob, distant thunder rumbling]'
      }
    ]
  },
  {
    id: 'spanish-heist',
    title: 'El Secreto de la Bóveda',
    titleEnglish: 'The Vault Secret (Spanish Heist Thriller)',
    originalLanguage: 'Spanish',
    genre: 'High-Stakes Bank Heist',
    duration: 32,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    fallbackPosterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    synopsisEnglish: 'Inside Madrid Central Vault with 30 seconds before SWAT breaches. Hear the adrenaline-fueled witty banter and rapid-fire commands dubbed seamlessly with matching voice speed and temperament.',
    directorVisualNotes: 'High-contrast tungsten lighting, rapid tracking shots. 60 FPS Motion Interpolation keeps frantic camera motion silky smooth.',
    originalAudioScore: 'Flamenco Guitar & Ticking Chronometer Design',
    defaultActionDescription: 'Carlos checks his tactical watch as orange security strobes pulse across the steel vault door; Lucia frantically reroutes fiber cables.',
    dialogues: [
      {
        id: 's-1',
        startTime: 2,
        endTime: 6,
        speaker: 'Professor Carlos',
        originalText: '¡Oye, escucha! Treinta segundos para que entre la policía. ¡Abre esa maldita puerta!',
        originalLang: 'Spanish',
        teluguColloquial: 'ఒరేయ్ విను! పోలీసులు దూసుకురావడానికి ముప్పై సెకన్లు మాత్రమే ఉంది... తలుపు పగలగొట్టు త్వరగా!',
        teluguTransliteration: 'Orey vinu! Police-lu doosukuraavadaniki muppai sekanlu maathrame undi... Thalupu pagalagottu thwaraga!',
        englishLiteral: 'Listen! Thirty seconds before police enter. Open that damn door!',
        culturalSlangExplanation: '"Maldita puerta" carries aggressive urgency, perfectly transcreated into a high-stakes cinema command.',
        emotion: 'angry',
        vocalPitch: 1.05,
        vocalRate: 1.2,
        soundCue: '[Rapid digital countdown beep, distant police sirens]'
      },
      {
        id: 's-2',
        startTime: 8,
        endTime: 14,
        speaker: 'Lucia (Hacker)',
        originalText: 'Tranquilo, hermano. El sistema cuántico está cayendo. No me jodas con prisas.',
        originalLang: 'Spanish',
        teluguColloquial: 'కంగారు పడకు బ్రదర్. మెయిన్ సర్వర్ క్రాష్ అవుతోంది. మధ్యలో నన్ను టెన్షన్ పెట్టకు!',
        teluguTransliteration: 'Kangaaru padaku brother. Main server crash avuthondi. Madhyalo nannu tension pettaku!',
        englishLiteral: "Chill, brother. The quantum system is falling. Don't stress me out.",
        culturalSlangExplanation: '"Hermano" is casual Spanish camaraderie ("bro/brother"), paired with a sarcastic dismissal of panic.',
        emotion: 'whisper',
        vocalPitch: 1.0,
        vocalRate: 1.0,
        soundCue: '[High-speed mechanical drill whirring, hydraulic release hiss]'
      },
      {
        id: 's-3',
        startTime: 16,
        endTime: 22,
        speaker: 'Professor Carlos',
        originalText: '¡La bóveda es nuestra! ¡Vámonos de aquí como fantasmas!',
        originalLang: 'Spanish',
        teluguColloquial: 'లాకర్ ఓపెన్ అయిపోయింది! ఇక గాలిలో దీపంలా ఎవరికీ దొరక్కుండా మాయమైపోదాం పదా!',
        teluguTransliteration: 'Locker open aipoyindi! Ika galilo deepamla evariki dorakkunda maayamaipodham padaa!',
        englishLiteral: "The vault is ours! Let's get out of here like ghosts!",
        culturalSlangExplanation: '"Como fantasmas" is a classic Iberian idiom for vanishing into thin air without a trace.',
        emotion: 'triumphant',
        vocalPitch: 1.1,
        vocalRate: 1.15,
        soundCue: '[Heavy steel vault gears clattering unlocked, triumphant acoustic flourish]'
      }
    ]
  },
  {
    id: 'japanese-scifi',
    title: 'Neo-Tokyo 2099',
    titleEnglish: 'Neo-Tokyo 2099 (Cyberpunk Anime)',
    originalLanguage: 'Japanese',
    genre: 'Cyberpunk Sci-Fi Anime',
    duration: 30,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    fallbackPosterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    synopsisEnglish: 'High above a rain-soaked futuristic metropolis, an augmented combatant discovers an encrypted memory from a forgotten era. Rich philosophical subtext delivered with tender acoustic precision.',
    directorVisualNotes: 'Volumetric bloom particles and neon cherry blossom gradients. 4K Neural Super-Resolution renders cel-shaded outlines razor sharp.',
    originalAudioScore: 'Zen Shakuhachi Flute & Spatial Ambient Synth',
    defaultActionDescription: 'Renji stands on the precipice of a holographic skyscraper, digital cherry petals scattering across his optic HUD as rain dissolves into cyan mist.',
    dialogues: [
      {
        id: 'j-1',
        startTime: 2,
        endTime: 7,
        speaker: 'Renji (レンジ)',
        originalText: '先輩、この街の記憶はすべて偽物だったのでしょうか？',
        originalLang: 'Japanese',
        teluguColloquial: 'సెన్‌పై... ఈ మహానగరంలో మనం బతికిన జ్ఞాపకాలన్నీ కేవలం ఒక భ్రమేనా?',
        teluguTransliteration: 'Senpai... Ee mahanagaramlo manam bathikina gnaapakalanni kevalam oka bhramenaa?',
        englishLiteral: 'Senpai, were all the memories of this city fake?',
        culturalSlangExplanation: '"Senpai" (先輩) is the quintessential mentor honorific in Japanese anime culture, loaded with nostalgic reverence.',
        emotion: 'whisper',
        vocalPitch: 0.95,
        vocalRate: 0.9,
        soundCue: '[Ethereal wind chime, synthetic wind rustling cybernetic coat]'
      },
      {
        id: 'j-2',
        startTime: 9,
        endTime: 16,
        speaker: 'Kaori (カオリ)',
        originalText: 'たとえ作られた記憶でも、今ここで感じている痛みは本物よ。',
        originalLang: 'Japanese',
        teluguColloquial: 'ఆ జ్ఞాపకాలు కంప్యూటర్ రాసినవే అయినా... నీ గుండెల్లో రగులుతున్న ఈ నొప్పి మాత్రం నిజమైనది రెంజీ.',
        teluguTransliteration: 'Aa gnaapakalu computer rasinave aina... Nee gundello raguluthunna ee noppi maathram nijamainadi Renji.',
        englishLiteral: 'Even if they are fabricated memories, the pain felt right now is real.',
        culturalSlangExplanation: 'A poignant philosophical anime monologue conveying existential truth despite simulation.',
        emotion: 'sorrow',
        vocalPitch: 1.05,
        vocalRate: 0.95,
        soundCue: '[Gentle bamboo flute resonance, raindrops echoing on glass]'
      }
    ]
  }
];

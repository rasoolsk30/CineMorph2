package com.cinelingo.player

import android.Manifest
import android.content.Context
import android.graphics.Color
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.app.PictureInPictureParams
import android.util.Rational
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.widget.*
import android.text.SpannableString
import android.text.Spanned
import android.text.TextPaint
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.view.TextureView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.TimeZone
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

@UnstableApi
class PlayerActivity : AppCompatActivity() {
    private lateinit var playerView: PlayerView
    private lateinit var topBar: LinearLayout
    private lateinit var hud: TextView
    private lateinit var subtitleOverlay: TextView
    private var player: androidx.media3.exoplayer.ExoPlayer? = null
    private var trackSelector: DefaultTrackSelector? = null
    private lateinit var videoUri: Uri
    private lateinit var audio: AudioManager
    private var maxVol = 1
    private var startPos = 0L
    private var pendingSeek = -1L
    private var gestureMode = 0
    private var volF = 0f
    private var speedIdx = 2
    private var modeIdx = 0
    private var subtitleOffsetMs = 0
    private var targetLanguage = "Telugu"
    private var subtitleCues: List<SubtitleCue> = emptyList()
    private var loadedSubtitleRaw: String = ""
    private var speechRecognizer: SpeechRecognizer? = null
    private var listening = false
    private var tts: TextToSpeech? = null
    private var roomRef: DocumentReference? = null
    private var roomListener: ListenerRegistration? = null
    private var chatListener: ListenerRegistration? = null
    private var roomAuthUid: String? = null
    private var isApplyingRemoteState = false
    private var roomCode: String? = null
    private var isRoomHost = false
    private var lastRemoteUpdate = 0L
    private var genreTheme = "Default"
    private var historyAuthPending = false
    private var subtitleSizeSp = 22f
    private var subtitleHighContrast = true
    private var subtitleTextColor = Color.WHITE
    private var subtitlesEnabled = true

    enum class LockState {
        UNLOCKED,
        LOCKED_HIDDEN,
        LOCKED_SHOW_UNLOCK
    }
    private var lockState = LockState.UNLOCKED
    private val lockAutoHideHandler = Handler(Looper.getMainLooper())
    private val hideUnlockRunnable = Runnable {
        if (lockState == LockState.LOCKED_SHOW_UNLOCK) {
            lockState = LockState.LOCKED_HIDDEN
            animateUnlockButton(false)
        }
    }

    private var playlistUris: ArrayList<String> = arrayListOf()
    private var playlistIndex = 0
    private var autoDub = false
    private var pictureBoost = false
    private var shownCueKey = ""
    private var dubSource = "en"
    private var dubReadyKey = ""
    private var dubTranslatorKey = ""
    private var dubTranslator: com.google.mlkit.nl.translate.Translator? = null
    private val dubCache = HashMap<String, String>()

    private val speeds = floatArrayOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)
    private val modes = intArrayOf(AspectRatioFrameLayout.RESIZE_MODE_FIT, AspectRatioFrameLayout.RESIZE_MODE_FILL, AspectRatioFrameLayout.RESIZE_MODE_ZOOM)
    private val modeNames = arrayOf("Fit", "Stretch", "Zoom")
    private val languages = arrayOf("Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "English", "Spanish", "French", "Japanese", "Korean")

    private data class SubtitleCue(val startMs: Long, val endMs: Long, val text: String)

    private val saveTranslatedSubtitle = registerForActivityResult(ActivityResultContracts.CreateDocument("application/x-subrip")) { uri ->
        if (uri != null) try { contentResolver.openOutputStream(uri)?.bufferedWriter(Charsets.UTF_8)?.use { it.write(pendingTranslatedSubtitle) }; showHud("Translated subtitle saved") } catch (e: Exception) { showHud("Could not save subtitle: ${e.message}") }
    }
    private var pendingTranslatedSubtitle = ""
    private val pickSubtitle = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) {}
            applySubtitle(uri)
        }
    }
    private val requestMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startVoiceRecognition() else showHud("Microphone permission denied")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val data = intent.data
        if (data == null) { finish(); return }
        videoUri = data
        playlistUris = intent.getStringArrayListExtra("playlist_uris") ?: arrayListOf(data.toString())
        playlistIndex = intent.getIntExtra("playlist_index", playlistUris.indexOf(data.toString())).coerceAtLeast(0)
        setContentView(R.layout.activity_player)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        playerView = findViewById(R.id.player_view)
        topBar = findViewById(R.id.top_bar)
        hud = findViewById(R.id.hud)
        subtitleOverlay = findViewById(R.id.subtitle_overlay)
        playerView.keepScreenOn = true
        playerView.setControllerVisibilityListener(PlayerView.ControllerVisibilityListener { vis -> topBar.visibility = if (vis == View.VISIBLE) View.VISIBLE else View.GONE })

        audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        maxVol = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
        tts = TextToSpeech(this) { status -> if (status == TextToSpeech.SUCCESS) tts?.language = Locale.getDefault() }
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) { runOnUiThread { setDubProgress(80, "Speaking"); if (autoDub) player?.volume = 0.2f } }
            override fun onDone(utteranceId: String?) { runOnUiThread { setDubProgress(100, "Done"); player?.volume = 1f } }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) { runOnUiThread { setDubProgress(0, "Error"); player?.volume = 1f } }
        })

        // Enable decoder fallback and prefer extension decoders for universal format & codec support
        val renderersFactory = androidx.media3.exoplayer.DefaultRenderersFactory(this)
            .setExtensionRendererMode(androidx.media3.exoplayer.DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true)

        val selector = DefaultTrackSelector(this)
        trackSelector = selector
        val p = androidx.media3.exoplayer.ExoPlayer.Builder(this, renderersFactory).setTrackSelector(selector).build()
        player = p
        playerView.player = p
        p.setMediaItem(MediaItem.fromUri(videoUri))
        val saved = getSharedPreferences("resume", MODE_PRIVATE).getLong(videoUri.toString(), 0L)
        if (saved > 0) p.seekTo(saved)
        p.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                saveHistory()
                publishPlayback()
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    saveHistory()
                    updateAudioTrackButtonUI()
                }
                if (playbackState == Player.STATE_ENDED) playAdjacent(1)
            }
            override fun onPlayerError(error: PlaybackException) {
                if (error.errorCode == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED) {
                    showHud("Hardware decoder init failed. Auto-switched to software fallback.")
                } else {
                    showHud("Playback error: ${error.errorCodeName}")
                }
            }
        })
        p.prepare()
        p.play()
        loadCachedSubtitle()
        autoScanLocalSubtitles(videoUri)

        subtitlesEnabled = getSharedPreferences("player_prefs", MODE_PRIVATE).getBoolean("subtitles_enabled_${videoUri.hashCode()}", getSharedPreferences("player_prefs", MODE_PRIVATE).getBoolean("subtitles_enabled_global", true))
        updateSubtitleToggleButtonUI()

        findViewById<Button>(R.id.btn_sub_toggle).setOnClickListener {
            if (lockState != LockState.UNLOCKED) return@setOnClickListener
            toggleSubtitles()
        }
        findViewById<Button>(R.id.btn_sub).setOnClickListener {
            if (lockState != LockState.UNLOCKED) return@setOnClickListener
            showSubtitlePickerMenu()
        }
        findViewById<Button>(R.id.btn_speed).setOnClickListener { setPlaybackSpeed((speedIdx + 1) % speeds.size) }
        findViewById<Button>(R.id.btn_speed_menu).setOnClickListener { showSpeedPicker() }
        findViewById<Button>(R.id.btn_next).setOnClickListener { playAdjacent(1) }
        findViewById<Button>(R.id.btn_previous).setOnClickListener { playAdjacent(-1) }
        setupTwoStepScreenLock()
        findViewById<Button>(R.id.btn_pip).setOnClickListener { enterPlayerPip() }
        findViewById<Button>(R.id.btn_aspect).setOnClickListener { b ->
            modeIdx = (modeIdx + 1) % modes.size
            playerView.resizeMode = modes[modeIdx]
            (b as TextView).text = modeNames[modeIdx]
        }
        findViewById<Button>(R.id.btn_voice).setOnClickListener {
            if (listening) stopVoiceRecognition() else {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startVoiceRecognition()
                else requestMic.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
        findViewById<Button>(R.id.btn_language).setOnClickListener { showLanguagePicker() }
        findViewById<Button>(R.id.btn_audio_track).setOnClickListener { showAudioTrackPicker() }
        findViewById<Button>(R.id.btn_sub_minus).setOnClickListener { subtitleOffsetMs = (subtitleOffsetMs - 500).coerceAtLeast(-10000); saveSubtitlePrefs(); updateSubtitleSyncIndicator(); showHud("Subtitle offset ${subtitleOffsetMs}ms"); updateSubtitle() }
        findViewById<Button>(R.id.btn_sub_plus).setOnClickListener { subtitleOffsetMs = (subtitleOffsetMs + 500).coerceAtMost(10000); saveSubtitlePrefs(); updateSubtitleSyncIndicator(); showHud("Subtitle offset +${subtitleOffsetMs}ms"); updateSubtitle() }
        findViewById<Button>(R.id.btn_sub_style).setOnClickListener { showSubtitleStylePicker() }
        findViewById<Button>(R.id.btn_translate_srt).setOnClickListener { translateLoadedSubtitle() }
        findViewById<Button>(R.id.btn_scene_search).setOnClickListener { showSceneSearch() }
        findViewById<Button>(R.id.btn_cowatch).setOnClickListener { showCoWatchDialog() }
        findViewById<Button>(R.id.btn_dub_preview).setOnClickListener { showDubPreview() }
        findViewById<Button>(R.id.btn_auto_dub).setOnClickListener { toggleAutoDub() }
        findViewById<Button>(R.id.btn_boost).setOnClickListener { togglePictureBoost() }
        findViewById<Button>(R.id.btn_theme).setOnClickListener { showGenreThemePicker() }
        findViewById<Button>(R.id.btn_ai_settings).setOnClickListener { showAiServerSettings() }
        genreTheme = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("genre_theme", "Default") ?: "Default"
        applyGenreTheme()
        subtitleOffsetMs = getSharedPreferences("player_prefs", MODE_PRIVATE).getInt("subtitle_offset", 0)
        subtitleSizeSp = getSharedPreferences("player_prefs", MODE_PRIVATE).getInt("subtitle_size_sp", 22).toFloat()
        subtitleHighContrast = getSharedPreferences("player_prefs", MODE_PRIVATE).getBoolean("subtitle_high_contrast", true)
        subtitleTextColor = getSharedPreferences("player_prefs", MODE_PRIVATE).getInt("subtitle_color", Color.WHITE)
        applySubtitleStyle(); updateSubtitleSyncIndicator()
        targetLanguage = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("target_language", "Telugu") ?: "Telugu"
        updateLanguageButton()

        val gd = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(e: MotionEvent): Boolean {
                startPos = player?.currentPosition ?: 0L; pendingSeek = -1L; gestureMode = 0
                volF = audio.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat()
                return true
            }
            override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                if (playerView.isControllerFullyVisible) playerView.hideController() else playerView.showController()
                return true
            }
            override fun onDoubleTap(e: MotionEvent): Boolean {
                val left = e.x < playerView.width / 2f
                player?.let { it.seekTo((it.currentPosition + if (left) -10_000L else 10_000L).coerceAtLeast(0L)) }
                showHud(if (left) "⏪ 10s" else "10s ⏩")
                return true
            }
            override fun onScroll(e1: MotionEvent?, e2: MotionEvent, dx: Float, dy: Float): Boolean {
                if (e1 == null) return false
                if (gestureMode == 0) gestureMode = when {
                    abs(e2.x - e1.x) > abs(e2.y - e1.y) -> 1
                    e1.x < playerView.width / 2f -> 2
                    else -> 3
                }
                val h = playerView.height.toFloat().coerceAtLeast(1f)
                when (gestureMode) {
                    1 -> {
                        val dur = player?.duration?.takeIf { it != C.TIME_UNSET && it > 0 } ?: Long.MAX_VALUE
                        pendingSeek = (startPos + ((e2.x - e1.x) / playerView.width * 90_000).toLong()).coerceIn(0L, dur)
                        showHud(fmt(pendingSeek))
                    }
                    2 -> {
                        val lp = window.attributes
                        val cur = if (lp.screenBrightness < 0) 0.5f else lp.screenBrightness
                        lp.screenBrightness = (cur + dy / h).coerceIn(0.02f, 1f)
                        window.attributes = lp
                        showHud("☀ ${(lp.screenBrightness * 100).roundToInt()}%")
                    }
                    3 -> {
                        volF = (volF + dy / h * maxVol * 1.2f).coerceIn(0f, maxVol.toFloat())
                        audio.setStreamVolume(AudioManager.STREAM_MUSIC, volF.roundToInt(), 0)
                        showHud("🔊 ${(volF / maxVol * 100).roundToInt()}%")
                    }
                }
                return true
            }
        })
        playerView.setOnTouchListener { _, ev ->
            gd.onTouchEvent(ev)
            if (ev.action == MotionEvent.ACTION_UP || ev.action == MotionEvent.ACTION_CANCEL) {
                if (pendingSeek >= 0) player?.seekTo(pendingSeek)
                pendingSeek = -1L; gestureMode = 0
            }
            true
        }
        handler.post(subtitleTicker)
    }

    private val handler = Handler(Looper.getMainLooper())
    private val subtitleTicker = object : Runnable {
        override fun run() { updateSubtitle(); publishPlayback(); handler.postDelayed(this, 500) }
    }

    private fun autoScanLocalSubtitles(uri: Uri) {
        try {
            if (uri.scheme == "file") {
                val file = java.io.File(uri.path ?: return)
                val parent = file.parentFile ?: return
                val baseName = file.nameWithoutExtension
                val extensions = listOf("srt", "vtt", "ass", "ssa")
                for (ext in extensions) {
                    val candidate = java.io.File(parent, "$baseName.$ext")
                    if (candidate.exists()) {
                        applySubtitle(Uri.fromFile(candidate))
                        showHud("Auto-detected subtitle: ${candidate.name}")
                        return
                    }
                }
            }
        } catch (_: Exception) {}
    }

    private fun applySubtitle(uri: Uri) {
        try {
            val raw = contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val parsed = parseSubtitles(raw)
            if (parsed.isEmpty()) {
                showHud("Could not read subtitles. Use SRT or WebVTT.")
                return
            }
            subtitleCues = parsed
            loadedSubtitleRaw = raw
            subtitlesEnabled = true
            updateSubtitleToggleButtonUI()
            cacheSubtitle(raw)
            showHud("Loaded ${parsed.size} subtitle cues · cached offline")
            updateSubtitle()
        } catch (e: Exception) { showHud("Subtitle error: ${e.message ?: "could not open file"}") }
    }

    private fun parseSubtitles(raw: String): List<SubtitleCue> {
        val normalized = raw.replace("\uFEFF", "").replace("\r", "")
        val blocks = normalized.split(Regex("\\n\\s*\\n"))
        val timeRegex = Regex("(?:(\\d{1,2}):)?(\\d{2}):(\\d{2})[,.](\\d{1,3})\\s*-->\\s*(?:(\\d{1,2}):)?(\\d{2}):(\\d{2})[,.](\\d{1,3})")
        return blocks.mapNotNull { block ->
            val lines = block.lines()
            val ti = lines.indexOfFirst { timeRegex.containsMatchIn(it) }
            if (ti < 0) return@mapNotNull null
            val m = timeRegex.find(lines[ti]) ?: return@mapNotNull null
            fun stamp(h: String, min: String, sec: String, ms: String): Long =
                (((h.ifBlank { "0" }.toLong() * 60 + min.toLong()) * 60 + sec.toLong()) * 1000) + ms.padEnd(3, '0').take(3).toLong()
            val start = stamp(m.groupValues[1], m.groupValues[2], m.groupValues[3], m.groupValues[4])
            val end = stamp(m.groupValues[5], m.groupValues[6], m.groupValues[7], m.groupValues[8])
            val text = lines.drop(ti + 1).joinToString("\n").replace(Regex("<[^>]+>"), "").trim()
            if (text.isBlank() || end <= start) null else SubtitleCue(start, end, text)
        }.sortedBy { it.startMs }
    }

    private fun toggleSubtitles() {
        subtitlesEnabled = !subtitlesEnabled
        getSharedPreferences("player_prefs", MODE_PRIVATE).edit()
            .putBoolean("subtitles_enabled_${videoUri.hashCode()}", subtitlesEnabled)
            .putBoolean("subtitles_enabled_global", subtitlesEnabled)
            .apply()

        updateSubtitleToggleButtonUI()

        if (!subtitlesEnabled) {
            subtitleOverlay.text = ""
            subtitleOverlay.visibility = View.GONE
            runCatching {
                player?.trackSelectionParameters = player?.trackSelectionParameters
                    ?.buildUpon()
                    ?.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                    ?.build() ?: player?.trackSelectionParameters!!
            }
            showHud("Subtitles OFF")
        } else {
            runCatching {
                player?.trackSelectionParameters = player?.trackSelectionParameters
                    ?.buildUpon()
                    ?.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                    ?.build() ?: player?.trackSelectionParameters!!
            }
            updateSubtitle()
            showHud("Subtitles ON")
        }
    }

    private fun updateSubtitleToggleButtonUI() {
        val btnToggle = findViewById<Button>(R.id.btn_sub_toggle) ?: return
        if (subtitlesEnabled) {
            btnToggle.text = "💬 CC ON"
            btnToggle.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFF6554B8.toInt())
            btnToggle.setTextColor(Color.WHITE)
        } else {
            btnToggle.text = "💬 CC OFF"
            btnToggle.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFF232A3B.toInt())
            btnToggle.setTextColor(0xFF9BA8BF.toInt())
        }
    }

    private fun showSubtitlePickerMenu() {
        val toggleText = if (subtitlesEnabled) "💬 Turn Subtitles OFF" else "💬 Turn Subtitles ON"
        val options = arrayOf(
            toggleText,
            "📂 Load External .SRT / .VTT File…",
            "🎨 Customize Subtitle Style & Colors",
            "⏱ Micro-Adjust Sync Offset (${if (subtitleOffsetMs >= 0) "+$subtitleOffsetMs" else subtitleOffsetMs}ms)",
            "🌐 Translate Subtitles to $targetLanguage"
        )
        AlertDialog.Builder(this)
            .setTitle("Subtitle Controls")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> toggleSubtitles()
                    1 -> pickSubtitle.launch(arrayOf("text/*", "application/x-subrip", "*/*"))
                    2 -> showSubtitleStylePicker()
                    3 -> showHud("Use Sub −500ms / Sub +500ms buttons in top bar")
                    4 -> translateLoadedSubtitle()
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun updateSubtitle() {
        if (!subtitlesEnabled) {
            subtitleOverlay.text = ""
            subtitleOverlay.visibility = View.GONE
            return
        }
        val pos = (player?.currentPosition ?: 0L) - subtitleOffsetMs
        val cue = subtitleCues.firstOrNull { pos >= it.startMs && pos < it.endMs }
        val key = if (cue == null) "" else "${cue.startMs}|${cue.text}"
        if (key != shownCueKey) {
            shownCueKey = key
            if (cue == null) {
                subtitleOverlay.text = ""
                subtitleOverlay.visibility = View.GONE
            } else {
                subtitleOverlay.text = clickableWords(cue.text)
                subtitleOverlay.movementMethod = LinkMovementMethod.getInstance()
                subtitleOverlay.visibility = View.VISIBLE
                if (autoDub) dubCue(cue)
            }
        }
        subtitleOverlay.setOnClickListener { cue?.let { showWordPicker(it.text) } }
    }

    /** Every word in the subtitle is tappable: tap a word to see its meaning. */
    private fun clickableWords(line: String): CharSequence {
        val sp = SpannableString(line)
        Regex("[\\p{L}\\p{M}\\p{N}'\u2019-]+").findAll(line).forEach { m ->
            val word = m.value.trim('-', '\'', '\u2019')
            if (word.length < 2) return@forEach
            sp.setSpan(object : ClickableSpan() {
                override fun onClick(widget: View) { player?.pause(); lookupWordMeaning(word, line) }
                override fun updateDrawState(ds: TextPaint) { ds.isUnderlineText = false }
            }, m.range.first, m.range.last + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        return sp
    }

    private fun updateSubtitleSyncIndicator() {
        val indicator = findViewById<TextView>(R.id.subtitle_sync_indicator) ?: return
        indicator.text = if (subtitleOffsetMs == 0) "Sync OK · 0ms" else "Recalibrating ${if (subtitleOffsetMs > 0) "+" else ""}${subtitleOffsetMs}ms"
        indicator.setTextColor(if (subtitleOffsetMs == 0) Color.WHITE else Color.rgb(255, 209, 102))
    }

    private fun showWordPicker(line: String) {
        val words = line.split(Regex("\\s+")).map { it.trim().trim(',', '.', '!', '?', ':', ';', '"', '\'') }.filter { it.length > 1 }.distinct().take(40)
        if (words.isEmpty()) return
        AlertDialog.Builder(this).setTitle("Tap a word to learn its meaning").setItems(words.toTypedArray()) { _, which -> lookupWordMeaning(words[which], line) }.setNegativeButton("Close", null).show()
    }

    private fun lookupWordMeaning(word: String, sentence: String) {
        val base = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("ai_backend_url", "").orEmpty().trimEnd('/')
        if (base.isBlank()) { offlineWordMeaning(word, sentence); return }
        showHud("Looking up '$word'…")
        Thread {
            var connection: HttpURLConnection? = null
            try {
                val payload = JSONObject().put("word", word).put("sentence", sentence).put("targetLang", targetLanguage)
                connection = (URL("$base/api/ai/word-definition").openConnection() as HttpURLConnection).apply { requestMethod = "POST"; connectTimeout = 12000; readTimeout = 30000; doOutput = true; setRequestProperty("Content-Type", "application/json; charset=utf-8") }
                connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                val status = connection.responseCode; val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val root = JSONObject(stream?.bufferedReader()?.use { it.readText() }.orEmpty())
                if (status !in 200..299 || !root.optBoolean("success")) throw IllegalStateException(root.optString("error", "Lookup failed"))
                val data = root.optJSONObject("data") ?: JSONObject()
                val message = "${data.optString("phoneticSpelling")}\n\nEnglish: ${data.optString("meaningInEnglish")}\n\n$targetLanguage: ${data.optString("meaningInTargetLang")}\n\nContext: ${data.optString("contextualUsage")}"
                runOnUiThread { AlertDialog.Builder(this).setTitle(word).setMessage(message).setPositiveButton("OK", null).show() }
            } catch (e: Exception) { runOnUiThread { showHud("Word lookup failed: ${e.message}") } }
            finally { connection?.disconnect() }
        }.start()
    }

    private fun offlineWordMeaning(word: String, sentence: String) {
        val tgt = OfflineTranslator.langCode(targetLanguage)
        if (tgt == null) { showHud("Offline translation does not support $targetLanguage"); return }
        showHud("Translating '$word'…")
        OfflineTranslator.detectSource(sentence) { src ->
            if (src == tgt) { showHud("Word is already in $targetLanguage"); return@detectSource }
            val tr = OfflineTranslator.getTranslator(src, tgt)
            OfflineTranslator.prepare(tr, {
                tr.translate(word).addOnSuccessListener { w ->
                    tr.translate(sentence).addOnSuccessListener { sTr ->
                        AlertDialog.Builder(this).setTitle(word)
                            .setMessage("$targetLanguage: $w\n\nSentence:\n$sTr")
                            .setPositiveButton("OK", null).show()
                        tr.close()
                    }.addOnFailureListener { tr.close() }
                }.addOnFailureListener { showHud("Word translation failed"); tr.close() }
            }, { err -> showHud("Model download failed: $err (internet needed the first time)") })
        }
    }

    private fun srtTime(ms: Long): String =
        "%02d:%02d:%02d,%03d".format(ms / 3600000, ms / 60000 % 60, ms / 1000 % 60, ms % 1000)

    private fun toSrt(cues: List<SubtitleCue>): String =
        cues.mapIndexed { i, c -> "${i + 1}\n${srtTime(c.startMs)} --> ${srtTime(c.endMs)}\n${c.text}\n" }.joinToString("\n")

    /** Free, backend-less SRT translation using on-device ML Kit. */
    private fun translateOffline() {
        val tgt = OfflineTranslator.langCode(targetLanguage)
        if (tgt == null) { showHud("Offline translation does not support $targetLanguage. Use an AI server."); return }
        val cues = subtitleCues
        if (cues.isEmpty()) { showHud("Load an SRT/VTT file first"); return }
        showHud("Preparing offline $targetLanguage translation (first time downloads a model)…")
        OfflineTranslator.detectSource(cues.take(25).joinToString(" ") { it.text }) { src ->
            if (src == tgt) { showHud("Subtitles are already in $targetLanguage"); return@detectSource }
            val tr = OfflineTranslator.getTranslator(src, tgt)
            OfflineTranslator.prepare(tr, {
                OfflineTranslator.translateList(tr, cues.map { it.text },
                    { done -> showHud("Translating $done / ${cues.size}") },
                    { out ->
                        val translated = cues.mapIndexed { i, c -> SubtitleCue(c.startMs, c.endMs, out.getOrElse(i) { c.text }) }
                        subtitleCues = translated
                        shownCueKey = ""
                        dubCache.clear()
                        pendingTranslatedSubtitle = toSrt(translated)
                        showHud("Translated to $targetLanguage")
                        saveTranslatedSubtitle.launch("${queryName(videoUri).substringBeforeLast('.', queryName(videoUri))}-$targetLanguage.srt")
                        tr.close()
                    },
                    { err -> showHud("Translation failed: $err"); tr.close() })
            }, { err -> showHud("Model download failed: $err (internet needed the first time)") })
        }
    }

    /** Subtitle-driven AI dubbing: each subtitle is translated and spoken with TTS; original audio is ducked. */
    private fun toggleAutoDub() {
        autoDub = !autoDub
        findViewById<Button>(R.id.btn_auto_dub).text = if (autoDub) "Auto dub: ON" else "Auto dub: OFF"
        if (!autoDub) { tts?.stop(); player?.volume = 1f; setDubProgress(0, "Ready"); return }
        if (subtitleCues.isEmpty()) { showHud("Load subtitles first. Auto dub speaks each subtitle in $targetLanguage"); return }
        OfflineTranslator.detectSource(subtitleCues.take(25).joinToString(" ") { it.text }) { src ->
            dubSource = src
            dubReadyKey = ""
            shownCueKey = ""
            showHud("Auto dub ON ($targetLanguage)")
        }
    }

    private fun dubCue(cue: SubtitleCue) {
        val tgt = OfflineTranslator.langCode(targetLanguage)
        if (tgt == null) { showHud("Auto dub does not support $targetLanguage"); return }
        val cacheKey = "$targetLanguage|${cue.startMs}"
        val cached = dubCache[cacheKey]
        if (cached != null) { speakDubbingText(cached); return }
        if (dubSource == tgt) { dubCache[cacheKey] = cue.text; speakDubbingText(cue.text); return }
        setDubProgress(30, "Translating")
        val key = "$dubSource>$tgt"
        val tr = if (dubTranslatorKey == key && dubTranslator != null) dubTranslator!! else {
            dubTranslator?.close()
            dubReadyKey = ""
            OfflineTranslator.getTranslator(dubSource, tgt).also { dubTranslator = it; dubTranslatorKey = key }
        }
        val run = {
            tr.translate(cue.text)
                .addOnSuccessListener { t -> dubCache[cacheKey] = t; if (autoDub) speakDubbingText(t) }
                .addOnFailureListener { setDubProgress(0, "Failed") }
        }
        if (dubReadyKey == key) run()
        else OfflineTranslator.prepare(tr, { dubReadyKey = key; run() },
            { err -> setDubProgress(0, "Failed"); showHud("Dub model download failed: $err") })
    }

    /** Basic picture boost (contrast + saturation) on the video surface. Not AI upscaling. */
    private fun togglePictureBoost() {
        val tv = playerView.videoSurfaceView as? TextureView
        if (tv == null) { showHud("Picture boost is not available on this surface"); return }
        pictureBoost = !pictureBoost
        if (pictureBoost) {
            val cm = ColorMatrix()
            cm.setSaturation(1.2f)
            val c = 1.12f
            val t = (-0.5f * c + 0.5f) * 255f
            cm.postConcat(ColorMatrix(floatArrayOf(
                c, 0f, 0f, 0f, t,
                0f, c, 0f, 0f, t,
                0f, 0f, c, 0f, t,
                0f, 0f, 0f, 1f, 0f
            )))
            val paint = Paint()
            paint.colorFilter = ColorMatrixColorFilter(cm)
            tv.setLayerType(View.LAYER_TYPE_HARDWARE, paint)
        } else {
            tv.setLayerType(View.LAYER_TYPE_NONE, null)
        }
        findViewById<Button>(R.id.btn_boost).text = if (pictureBoost) "Boost: ON" else "Boost: OFF"
        showHud(if (pictureBoost) "Picture boost ON" else "Picture boost OFF")
    }

    private fun translateLoadedSubtitle() {
        if (loadedSubtitleRaw.isBlank()) { showHud("Load an SRT/VTT file first"); return }
        val base = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("ai_backend_url", "").orEmpty().trimEnd('/')
        if (base.isBlank()) { translateOffline(); return }
        showHud("Translating subtitles to $targetLanguage…")
        Thread {
            var connection: HttpURLConnection? = null
            try {
                val payload = JSONObject().put("subtitleText", loadedSubtitleRaw).put("targetLang", targetLanguage)
                connection = (URL("$base/api/ai/translate-subtitles").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"; connectTimeout = 15000; readTimeout = 90000; doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
                connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val result = JSONObject(stream?.bufferedReader()?.use { it.readText() }.orEmpty())
                if (status !in 200..299 || !result.optBoolean("success")) throw IllegalStateException(result.optString("error", "Translation failed"))
                val translated = result.optString("translatedSubtitle")
                if (parseSubtitles(translated).isEmpty()) throw IllegalStateException("Translated subtitle file is invalid")
                runOnUiThread { pendingTranslatedSubtitle = translated; saveTranslatedSubtitle.launch("${queryName(videoUri).substringBeforeLast('.', queryName(videoUri))}-$targetLanguage.srt") }
            } catch (e: Exception) { runOnUiThread { showHud("SRT translation failed: ${e.message ?: "check backend"}") } }
            finally { connection?.disconnect() }
        }.start()
    }

    private fun setPlaybackSpeed(index: Int) {
        speedIdx = index.coerceIn(speeds.indices)
        player?.setPlaybackSpeed(speeds[speedIdx])
        findViewById<Button>(R.id.btn_speed)?.text = "${speeds[speedIdx]}x"
        showHud("Playback speed ${speeds[speedIdx]}x")
    }

    private fun showSpeedPicker() {
        val labels = speeds.map { "${it}x" }.toTypedArray()
        AlertDialog.Builder(this).setTitle("Playback speed")
            .setSingleChoiceItems(labels, speedIdx) { dialog, which -> setPlaybackSpeed(which); dialog.dismiss() }.setNegativeButton("Close", null).show()
    }

    private fun playAdjacent(delta: Int) {
        val next = playlistIndex + delta
        if (next !in playlistUris.indices) { showHud(if (delta > 0) "No next video in this folder" else "No previous video in this folder"); return }
        val uri = Uri.parse(playlistUris[next])
        playlistIndex = next
        videoUri = uri
        subtitleCues = emptyList(); subtitleOverlay.text = ""; subtitleOverlay.visibility = View.GONE
        player?.let { exo ->
            exo.setMediaItem(MediaItem.fromUri(uri))
            val saved = getSharedPreferences("resume", MODE_PRIVATE).getLong(uri.toString(), 0L)
            if (saved > 0L) exo.seekTo(saved)
            exo.prepare(); exo.play()
        }
        showHud("Now playing: ${queryName(uri)}")
    }

    private fun setupTwoStepScreenLock() {
        val interceptor = findViewById<View>(R.id.lock_touch_interceptor) ?: return
        val btnUnlock = findViewById<TextView>(R.id.btn_unlock_confirm) ?: return

        findViewById<Button>(R.id.btn_lock)?.setOnClickListener {
            activateScreenLock()
        }

        interceptor.setOnTouchListener { _, event ->
            if (lockState == LockState.UNLOCKED) return@setOnTouchListener false

            if (event.action == MotionEvent.ACTION_DOWN) {
                if (lockState == LockState.LOCKED_HIDDEN) {
                    lockState = LockState.LOCKED_SHOW_UNLOCK
                    animateUnlockButton(true)
                    scheduleUnlockButtonAutoHide()
                } else if (lockState == LockState.LOCKED_SHOW_UNLOCK) {
                    scheduleUnlockButtonAutoHide()
                }
            }
            true
        }

        btnUnlock.setOnClickListener {
            if (lockState != LockState.UNLOCKED) {
                unlockScreen()
            }
        }
    }

    private fun activateScreenLock() {
        lockState = LockState.LOCKED_HIDDEN
        playerView.useController = false
        playerView.hideController()
        topBar.visibility = View.GONE

        val interceptor = findViewById<View>(R.id.lock_touch_interceptor)
        interceptor?.visibility = View.VISIBLE

        val container = findViewById<View>(R.id.unlock_button_container)
        container?.visibility = View.GONE
        container?.alpha = 0f

        showHud("Screen Locked (Two-Step Protection Active)")
    }

    private fun unlockScreen() {
        lockAutoHideHandler.removeCallbacks(hideUnlockRunnable)
        lockState = LockState.UNLOCKED

        val interceptor = findViewById<View>(R.id.lock_touch_interceptor)
        interceptor?.visibility = View.GONE

        animateUnlockButton(false)

        playerView.useController = true
        topBar.visibility = View.VISIBLE

        showHud("Screen Unlocked")
    }

    private fun animateUnlockButton(show: Boolean) {
        val container = findViewById<View>(R.id.unlock_button_container) ?: return
        if (show) {
            container.visibility = View.VISIBLE
            container.animate().alpha(1f).setDuration(220).start()
        } else {
            container.animate().alpha(0f).setDuration(220).withEndAction {
                container.visibility = View.GONE
            }.start()
        }
    }

    private fun scheduleUnlockButtonAutoHide() {
        lockAutoHideHandler.removeCallbacks(hideUnlockRunnable)
        lockAutoHideHandler.postDelayed(hideUnlockRunnable, 3000)
    }

    private fun enterPlayerPip() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val params = PictureInPictureParams.Builder().setAspectRatio(Rational(16, 9)).build()
                enterPictureInPictureMode(params)
            } catch (_: Exception) { showHud("Picture-in-Picture is unavailable on this device") }
        } else showHud("PiP needs Android 8 or newer")
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: android.content.res.Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (::topBar.isInitialized) topBar.visibility = if (isInPictureInPictureMode) View.GONE else View.VISIBLE
        if (::hud.isInitialized && isInPictureInPictureMode) hud.visibility = View.GONE
    }

    private fun showSubtitleStylePicker() {
        val options = arrayOf("Size: Small 18sp", "Size: Normal 22sp", "Size: Large 26sp", "Size: Extra large 30sp", "Color: White", "Color: Yellow", "Color: Cyan", "Color: Green", "Toggle dark background")
        AlertDialog.Builder(this).setTitle("Subtitle preferences").setItems(options) { _, which ->
            when (which) {
                in 0..3 -> { val sizes = intArrayOf(18, 22, 26, 30); subtitleSizeSp = sizes[which].toFloat(); getSharedPreferences("player_prefs", MODE_PRIVATE).edit().putInt("subtitle_size_sp", sizes[which]).apply() }
                4 -> subtitleTextColor = Color.WHITE
                5 -> subtitleTextColor = Color.YELLOW
                6 -> subtitleTextColor = Color.CYAN
                7 -> subtitleTextColor = Color.GREEN
                8 -> subtitleHighContrast = !subtitleHighContrast
            }
            getSharedPreferences("player_prefs", MODE_PRIVATE).edit().putInt("subtitle_color", subtitleTextColor).putBoolean("subtitle_high_contrast", subtitleHighContrast).apply()
            applySubtitleStyle(); showHud("Subtitle style updated")
        }.setNegativeButton("Close", null).show()
    }

    private fun applySubtitleStyle() {
        if (!::subtitleOverlay.isInitialized) return
        subtitleOverlay.textSize = subtitleSizeSp
        subtitleOverlay.setTextColor(subtitleTextColor)
        subtitleOverlay.setBackgroundColor(if (subtitleHighContrast) Color.argb(150, 0, 0, 0) else Color.TRANSPARENT)
    }

    private fun setDubProgress(progress: Int, status: String) {
        if (isFinishing || isDestroyed) return
        findViewById<ProgressBar>(R.id.dub_progress)?.progress = progress
        findViewById<TextView>(R.id.txt_dub_status)?.text = "Dub: $status"
    }

    private fun showAudioTrackPicker() {
        val selector = trackSelector
        val mapped = selector?.currentMappedTrackInfo
        if (selector == null || mapped == null) {
            showHud("Audio tracks are loading…")
            return
        }
        val groups = mapped.getTrackGroups(C.TRACK_TYPE_AUDIO)
        val entries = mutableListOf<String>()
        val choices = mutableListOf<Pair<Int, Int>>()
        entries.add("System default (Original audio)")
        choices.add(-1 to -1)

        for (g in 0 until groups.length) {
            val group = groups[g]
            for (t in 0 until group.length) {
                val f = group.getFormat(t)
                val lang = f.language?.takeIf { it.isNotBlank() && it != "und" }
                    ?.let { Locale.forLanguageTag(it).getDisplayLanguage(Locale.getDefault()) }
                    ?: f.label?.takeIf { it.isNotBlank() }
                    ?: "Track ${t + 1}"
                val codec = f.sampleMimeType?.substringAfter("audio/")?.uppercase() ?: "AUDIO"
                val channels = f.channelCount.takeIf { it > 0 }?.let { "${it}ch" } ?: ""
                val detail = listOfNotNull(lang, codec, channels.takeIf { it.isNotEmpty() }).joinToString(" · ")
                entries.add(detail)
                choices.add(g to t)
            }
        }

        if (entries.size == 2 && choices[1].first >= 0) {
            val trackName = entries[1]
            AlertDialog.Builder(this)
                .setTitle("Audio Track Information")
                .setMessage("Active Track: $trackName\n\nThis video contains 1 embedded audio track.")
                .setPositiveButton("Keep Selected", null)
                .setNeutralButton("System Default") { _, _ ->
                    val builder = selector.buildUponParameters().clearOverridesOfType(C.TRACK_TYPE_AUDIO)
                    selector.parameters = builder.build()
                    updateAudioTrackButtonUI()
                    showHud("Audio: System Default")
                }
                .show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Select Audio Language / Track")
            .setItems(entries.toTypedArray()) { _, which ->
                val (groupIndex, trackIndex) = choices[which]
                val builder = selector.buildUponParameters()
                if (groupIndex < 0) {
                    builder.clearOverridesOfType(C.TRACK_TYPE_AUDIO)
                } else {
                    val group = groups[groupIndex]
                    builder.clearOverridesOfType(C.TRACK_TYPE_AUDIO)
                        .setOverrideForType(TrackSelectionOverride(group, listOf(trackIndex)))
                }
                selector.parameters = builder.build()
                updateAudioTrackButtonUI()
                showHud("Audio switched: ${entries[which]}")
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun updateAudioTrackButtonUI() {
        val btn = findViewById<Button>(R.id.btn_audio_track) ?: return
        val selector = trackSelector
        val mapped = selector?.currentMappedTrackInfo
        if (selector == null || mapped == null) {
            btn.text = "Audio track"
            return
        }
        val parameters = selector.parameters
        val override = parameters.overrides.values.firstOrNull { it.mediaTrackGroup.type == C.TRACK_TYPE_AUDIO }
        if (override != null && override.mediaTrackGroup.length > 0) {
            val format = override.mediaTrackGroup.getFormat(override.trackIndices.firstOrNull() ?: 0)
            val lang = format.language?.takeIf { it.isNotBlank() && it != "und" }
                ?.let { Locale.forLanguageTag(it).getDisplayLanguage(Locale.getDefault()) }
                ?: format.label?.takeIf { it.isNotBlank() } ?: "Track 1"
            btn.text = "Audio: $lang"
        } else {
            btn.text = "Audio: Default"
        }
    }

    private fun showLanguagePicker() {
        val recent = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("recent_languages", "")!!.split("|").filter { it.isNotBlank() }
        val options = (recent + languages).distinct().toTypedArray()
        AlertDialog.Builder(this).setTitle("Dubbing / language preference")
            .setItems(options) { _, which ->
                targetLanguage = options[which]
                val updated = (listOf(targetLanguage) + recent.filterNot { it == targetLanguage }).take(5)
                getSharedPreferences("player_prefs", MODE_PRIVATE).edit()
                    .putString("target_language", targetLanguage).putString("recent_languages", updated.joinToString("|")).apply()
                updateLanguageButton()
                showHud("$targetLanguage selected")
            }.setNegativeButton("Cancel", null).show()
    }

    private fun updateLanguageButton() { findViewById<Button>(R.id.btn_language).text = "Dub: $targetLanguage" }
    private fun saveSubtitlePrefs() { getSharedPreferences("player_prefs", MODE_PRIVATE).edit().putInt("subtitle_offset", subtitleOffsetMs).apply() }

    private fun showSceneSearch() {
        val input = EditText(this).apply { hint = "e.g. when he says the truth, chase, betrayal, or 01:25" }
        AlertDialog.Builder(this).setTitle("Semantic scene search")
            .setMessage("Search the loaded subtitle timeline. For Gemini semantic matching, set your secured AI backend URL in AI server settings.")
            .setView(input).setPositiveButton("Search") { _, _ ->
                val q = input.text.toString().trim()
                if (q.isBlank()) return@setPositiveButton
                val timeMatch = Regex("^(\\d{1,2}:)?\\d{1,2}:\\d{2}$").matches(q)
                if (timeMatch) {
                    val parts = q.split(":").mapNotNull { it.toLongOrNull() }
                    val sec = if (parts.size == 3) parts[0] * 3600 + parts[1] * 60 + parts[2] else parts[0] * 60 + parts[1]
                    player?.seekTo(sec * 1000); showHud("Jumped to ${fmt(sec * 1000)}")
                } else if (subtitleCues.isNotEmpty()) {
                    searchSceneInBackend(q)
                } else {
                    showHud("Load an SRT/VTT subtitle first to search actual scene dialogue.")
                }
            }.setNeutralButton("AI server settings") { _, _ -> showAiServerSettings() }
            .setNegativeButton("Cancel", null).show()
    }

    private fun searchSceneInBackend(query: String) {
        val base = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("ai_backend_url", "").orEmpty().trim().trimEnd('/')
        val local = subtitleCues.maxByOrNull { cue ->
            query.lowercase(Locale.ROOT).split(Regex("[^\\p{L}\\p{N}]+")).filter { it.length > 2 }
                .count { cue.text.lowercase(Locale.ROOT).contains(it) }
        }
        val localScore = local?.let { cue -> query.lowercase(Locale.ROOT).split(Regex("[^\\p{L}\\p{N}]+")).filter { it.length > 2 }.count { cue.text.lowercase(Locale.ROOT).contains(it) } } ?: 0
        if (base.isBlank()) {
            if (local != null && localScore > 0) {
                player?.seekTo(local.startMs); showHud("Subtitle match · ${fmt(local.startMs)}\n${local.text.take(100)}")
            } else showHud("No subtitle keyword match. Configure a secured Gemini backend for semantic search.")
            return
        }
        showHud("Searching subtitle timeline with AI…")
        Thread {
            var connection: HttpURLConnection? = null
            try {
                val payload = JSONObject().put("query", query).put("movieTitle", queryName(videoUri))
                val cues = JSONArray()
                subtitleCues.take(500).forEach { cue -> cues.put(JSONObject().put("startMs", cue.startMs).put("text", cue.text.take(500))) }
                payload.put("cues", cues)
                connection = (URL("$base/api/ai/search-scene").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"; connectTimeout = 12000; readTimeout = 25000; doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
                connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                val root = JSONObject(response)
                if (status !in 200..299 || !root.optBoolean("success")) throw IllegalStateException(root.optString("error", "AI search failed"))
                val data = root.optJSONObject("data") ?: throw IllegalStateException("AI response missing data")
                val timestamp = data.optLong("startMs", -1L)
                if (timestamp < 0 || subtitleCues.none { it.startMs == timestamp }) throw IllegalStateException("AI returned no valid subtitle timestamp")
                runOnUiThread {
                    player?.seekTo(timestamp)
                    showHud("${data.optString("method", "AI scene match")} · ${fmt(timestamp)}\n${data.optString("matchedText").take(100)}")
                }
            } catch (e: Exception) {
                runOnUiThread {
                    if (local != null && localScore > 0) {
                        player?.seekTo(local.startMs); showHud("AI unavailable; subtitle match · ${fmt(local.startMs)}")
                    } else showHud("Scene search failed: ${e.message ?: "check AI backend URL"}")
                }
            } finally { connection?.disconnect() }
        }.start()
    }

    private fun showAiServerSettings() {
        val current = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("ai_backend_url", "").orEmpty()
        val input = EditText(this).apply { setText(current); hint = "https://your-secured-server.example"; setSingleLine(true) }
        AlertDialog.Builder(this).setTitle("Gemini backend")
            .setMessage("Enter the base URL of the deployed CineMorph web-companion server. Keep GEMINI_API_KEY on the server only; never paste it into this app.")
            .setView(input).setPositiveButton("Save") { _, _ ->
                val value = input.text.toString().trim().trimEnd('/')
                getSharedPreferences("player_prefs", MODE_PRIVATE).edit().putString("ai_backend_url", value).apply()
                showHud(if (value.isBlank()) "AI backend cleared" else "AI backend URL saved")
            }.setNeutralButton("Clear") { _, _ ->
                getSharedPreferences("player_prefs", MODE_PRIVATE).edit().remove("ai_backend_url").apply(); showHud("AI backend cleared")
            }.setNegativeButton("Cancel", null).show()
    }

    private fun showGenreThemePicker() {
        val genres = arrayOf("Default", "Action", "Comedy", "Horror", "Romance", "Sci-Fi", "Noir")
        AlertDialog.Builder(this).setTitle("Genre-based player theme").setItems(genres) { _, which ->
            genreTheme = genres[which]
            getSharedPreferences("player_prefs", MODE_PRIVATE).edit().putString("genre_theme", genreTheme).apply()
            applyGenreTheme(); showHud("$genreTheme theme applied")
        }.show()
    }

    private fun applyGenreTheme() {
        if (!::topBar.isInitialized) return
        val color = when (genreTheme) {
            "Action" -> Color.rgb(92, 22, 24)
            "Comedy" -> Color.rgb(104, 76, 8)
            "Horror" -> Color.rgb(28, 12, 38)
            "Romance" -> Color.rgb(105, 35, 64)
            "Sci-Fi" -> Color.rgb(8, 62, 82)
            "Noir" -> Color.rgb(22, 25, 32)
            else -> Color.rgb(16, 19, 27)
        }
        topBar.setBackgroundColor((color and 0x00FFFFFF) or (0xCC shl 24))
        hud.setBackgroundColor((color and 0x00FFFFFF) or (0xDD shl 24))
    }

    private fun subtitleCacheFile(): java.io.File {
        val dir = java.io.File(filesDir, "subtitle-cache").apply { mkdirs() }
        return java.io.File(dir, "${videoUri.toString().hashCode().toUInt().toString(16)}.srt")
    }

    private fun cacheSubtitle(raw: String) {
        try { subtitleCacheFile().writeText(raw, Charsets.UTF_8) } catch (_: Exception) {}
    }

    private fun loadCachedSubtitle() {
        try {
            val file = subtitleCacheFile()
            if (file.exists()) {
                val parsed = parseSubtitles(file.readText(Charsets.UTF_8))
                if (parsed.isNotEmpty()) { loadedSubtitleRaw = file.readText(Charsets.UTF_8); subtitleCues = parsed; showHud("Restored ${parsed.size} subtitle cues from offline cache"); updateSubtitle() }
            }
        } catch (_: Exception) {}
    }

    private fun showDubPreview() {
        val currentPos = (player?.currentPosition ?: 0L) - subtitleOffsetMs
        val currentDialogue = subtitleCues.firstOrNull { currentPos >= it.startMs && currentPos < it.endMs }?.text.orEmpty()
        val sample = when (targetLanguage) {
            "Telugu" -> "ఇది AI డబ్బింగ్ ప్రివ్యూ మాత్రమే. అసలు సినిమా ఆడియో అనువాదం ఇంకా కనెక్ట్ కాలేదు."
            "Hindi" -> "यह केवल AI डबिंग का नमूना है।"
            "Spanish" -> "Esta es solo una vista previa de doblaje de IA."
            else -> "This is a sample dubbing preview. Full movie audio dubbing requires a connected synthesis service."
        }
        AlertDialog.Builder(this).setTitle("Voice AI Lab · $targetLanguage")
            .setMessage(if (currentDialogue.isBlank()) "No subtitle is active right now. You can speak a sample, or load subtitles and try again.\n\n$sample" else "Current subtitle:\n$currentDialogue\n\nTranslate this line with the configured AI backend and speak it using device TTS.")
            .setPositiveButton("Translate & speak") { _, _ ->
                if (currentDialogue.isBlank()) speakDubbingText(sample)
                else translateAndSpeak(currentDialogue)
            }.setNeutralButton("Speak sample") { _, _ -> speakDubbingText(sample) }
            .setNegativeButton("Close", null).show()
    }

    private fun speakDubbingText(text: String) {
        val locale = when (targetLanguage) {
            "Telugu" -> Locale("te", "IN"); "Hindi" -> Locale("hi", "IN"); "Spanish" -> Locale("es", "ES")
            "French" -> Locale.FRENCH; "Japanese" -> Locale.JAPANESE; "Korean" -> Locale.KOREAN
            "Tamil" -> Locale("ta", "IN"); "Kannada" -> Locale("kn", "IN"); "Malayalam" -> Locale("ml", "IN")
            else -> Locale.US
        }
        val status = tts?.setLanguage(locale)
        if (status == TextToSpeech.LANG_MISSING_DATA || status == TextToSpeech.LANG_NOT_SUPPORTED) {
            showHud("This device has no TTS voice for $targetLanguage. Install the language voice in Android settings.")
            return
        }
        setDubProgress(70, "Ready to speak")
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cinemorph-dub-preview")
        if (!autoDub) showHud("Speaking $targetLanguage preview")
    }

    private fun translateAndSpeak(dialogue: String) {
        val base = getSharedPreferences("player_prefs", MODE_PRIVATE).getString("ai_backend_url", "").orEmpty().trim().trimEnd('/')
        if (base.isBlank()) { showAiServerSettings(); return }
        setDubProgress(25, "Translating")
        showHud("Transcreating subtitle for $targetLanguage…")
        Thread {
            var connection: HttpURLConnection? = null
            try {
                val payload = JSONObject().put("dialogue", dialogue.take(2000)).put("sourceLang", "English")
                    .put("targetLang", targetLanguage).put("emotion", "Natural cinematic delivery")
                    .put("sceneContext", queryName(videoUri))
                connection = (URL("$base/api/ai/transcreate").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"; connectTimeout = 12000; readTimeout = 30000; doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
                connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val root = JSONObject(stream?.bufferedReader()?.use { it.readText() }.orEmpty())
                if (status !in 200..299 || !root.optBoolean("success")) throw IllegalStateException(root.optString("error", "translation failed"))
                val data = root.optJSONObject("data") ?: throw IllegalStateException("translation response missing data")
                if (root.optString("note").contains("returned unchanged", ignoreCase = true))
                    throw IllegalStateException("Gemini is unavailable; the line was not translated. Add GEMINI_API_KEY to the backend.")
                val localized = data.optString("localizedText", "").ifBlank { data.optString("localizedTelugu", "") }
                if (localized.isBlank()) throw IllegalStateException("backend returned no localized dialogue")
                runOnUiThread { setDubProgress(65, "Translated"); speakDubbingText(localized) }
            } catch (e: Exception) {
                runOnUiThread { setDubProgress(0, "Failed"); showHud("Translation failed: ${e.message ?: "check backend URL"}") }
            } finally { connection?.disconnect() }
        }.start()
    }

    private fun startVoiceRecognition() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { showHud("Speech recognition is not available on this device"); return }
        stopVoiceRecognition()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { listening = true; findViewById<Button>(R.id.btn_voice).text = "🎙 Listening"; showHud("Listening for commands…") }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() { listening = false; findViewById<Button>(R.id.btn_voice).text = "🎙 Voice" }
            override fun onError(error: Int) { listening = false; findViewById<Button>(R.id.btn_voice).text = "🎙 Voice"; if (error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) showHud("Voice error ($error)") }
            override fun onResults(results: Bundle?) {
                val phrase = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty().lowercase(Locale.ROOT)
                if (phrase.isNotBlank()) processVoiceCommand(phrase)
                listening = false; findViewById<Button>(R.id.btn_voice).text = "🎙 Voice"
            }
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Say play, pause, rewind 30 seconds, volume up, or translate to Spanish")
        }
        speechRecognizer?.startListening(intent)
    }

    private fun stopVoiceRecognition() {
        listening = false
        try { speechRecognizer?.cancel(); speechRecognizer?.destroy() } catch (_: Exception) {}
        speechRecognizer = null
        if (::topBar.isInitialized) findViewById<Button>(R.id.btn_voice).text = "🎙 Voice"
    }

    private fun processVoiceCommand(phrase: String) {
        val p = player ?: return
        when {
            phrase.contains("pause") || phrase == "stop" -> { p.pause(); showHud("Voice: Pause") }
            phrase.contains("play") || phrase.contains("resume") -> { p.play(); showHud("Voice: Play") }
            phrase.contains("rewind") || phrase.contains("back") -> {
                val amount = Regex("(\\d+)\\s*(second|seconds|sec|secs)").find(phrase)?.groupValues?.get(1)?.toLongOrNull() ?: 10L
                p.seekTo((p.currentPosition - amount * 1000).coerceAtLeast(0)); showHud("Voice: Rewind ${amount}s")
            }
            phrase.contains("forward") || phrase.contains("skip") -> {
                val amount = Regex("(\\d+)\\s*(second|seconds|sec|secs)").find(phrase)?.groupValues?.get(1)?.toLongOrNull() ?: 10L
                p.seekTo((p.currentPosition + amount * 1000).coerceAtMost(p.duration.coerceAtLeast(0))); showHud("Voice: Forward ${amount}s")
            }
            phrase.contains("volume up") || phrase.contains("increase volume") -> {
                audio.setStreamVolume(AudioManager.STREAM_MUSIC, (audio.getStreamVolume(AudioManager.STREAM_MUSIC) + 1).coerceAtMost(maxVol), 0); showHud("Volume up")
            }
            phrase.contains("volume down") || phrase.contains("decrease volume") -> {
                audio.setStreamVolume(AudioManager.STREAM_MUSIC, (audio.getStreamVolume(AudioManager.STREAM_MUSIC) - 1).coerceAtLeast(0), 0); showHud("Volume down")
            }
            phrase.contains("mute") -> { audio.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0); showHud("Muted") }
            phrase.contains("translate to") || phrase.contains("dub in") -> {
                val match = languages.firstOrNull { phrase.contains(it.lowercase(Locale.ROOT)) }
                if (match != null) { targetLanguage = match; getSharedPreferences("player_prefs", MODE_PRIVATE).edit().putString("target_language", match).apply(); updateLanguageButton(); showHud("Language: $match") }
                else showHud("Say a supported language name")
            }
            phrase.contains("subtitle") && phrase.contains("delay") -> { subtitleOffsetMs += 500; saveSubtitlePrefs(); showHud("Subtitle offset +${subtitleOffsetMs}ms") }
            phrase.contains("find scene") || phrase.contains("search scene") -> showSceneSearch()
            else -> showHud("Command not recognized: $phrase")
        }
        publishPlayback()
    }

    private fun showCoWatchDialog() {
        if (BuildConfig.FIREBASE_API_KEY.isBlank() || BuildConfig.FIREBASE_APP_ID.isBlank() ||
            BuildConfig.FIREBASE_PROJECT_ID.isBlank() || BuildConfig.FIRESTORE_DATABASE_ID.isBlank()) {
            AlertDialog.Builder(this).setTitle("Co-Watch setup required")
                .setMessage("Firebase project values are missing. Check FIREBASE_API_KEY, FIREBASE_APP_ID, FIREBASE_PROJECT_ID and FIRESTORE_DATABASE_ID in gradle.properties. Enable Anonymous Authentication and deploy web-companion/firestore.rules to that exact Firestore database.")
                .setPositiveButton("OK", null).show()
            return
        }
        try {
            val app = getOrCreateFirebaseApp()
            val auth = FirebaseAuth.getInstance(app)
            val continueWithUser: (String) -> Unit = { uid ->
                roomAuthUid = uid
                val input = EditText(this).apply { hint = "Room code (leave blank to create)"; setSingleLine(true) }
                AlertDialog.Builder(this).setTitle("Co-Watch party")
                    .setMessage("Both people need the same movie file available locally. Create a room or enter a friend's six-digit code.")
                    .setView(input).setPositiveButton("Join / Create") { _, _ ->
                        val entered = input.text.toString().trim().uppercase(Locale.ROOT)
                        if (entered.isNotBlank() && !Regex("\\d{6}").matches(entered)) {
                            showHud("Room code must be exactly 6 digits")
                            return@setPositiveButton
                        }
                        val code = if (entered.isBlank()) (100000..999999).random().toString() else entered
                        val db = FirebaseFirestore.getInstance(app, BuildConfig.FIRESTORE_DATABASE_ID)
                        roomRef = db.collection("cowatch_rooms").document(code)
                        isRoomHost = entered.isBlank()
                        val videoName = queryName(videoUri).ifBlank { "Video" }
                        val movieId = Integer.toHexString(videoName.lowercase(Locale.ROOT).hashCode())
                        if (isRoomHost) {
                            val now = System.currentTimeMillis()
                            val state = mapOf<String, Any>("roomId" to code, "hostId" to uid, "hostName" to "Cinema Host",
                                "movieId" to movieId, "movieTitle" to videoName, "videoName" to videoName,
                                "isPlaying" to (player?.isPlaying ?: false), "currentTime" to ((player?.currentPosition ?: 0L) / 1000.0),
                                "updatedAt" to isoNow(), "lastUpdated" to now, "targetLang" to "te", "createdAt" to isoNow(),
                                "participants" to listOf(mapOf("uid" to uid, "name" to "Cinema Host", "joinedAt" to isoNow(), "isHost" to true)),
                                "activeUserCount" to 1)
                            roomRef!!.set(state).addOnSuccessListener {
                                roomCode = code; attachRoomListener(); showCoWatchChat(code)
                                showHud("Co-Watch room created: $code")
                            }.addOnFailureListener { showHud("Room create failed: ${it.message}") }
                        } else {
                            roomRef!!.get().addOnSuccessListener { snap ->
                                if (!snap.exists()) { showHud("Room $code not found"); return@addOnSuccessListener }
                                val remoteMovie = snap.getString("movieId").orEmpty()
                                if (remoteMovie != movieId) {
                                    AlertDialog.Builder(this).setTitle("Different video file?")
                                        .setMessage("Room video: ${snap.getString("videoName") ?: "unknown"}\nYour video: $videoName\n\nContinue only if these files contain the same movie in the same cut.")
                                        .setPositiveButton("Join anyway") { _, _ -> joinFirestoreRoom(code, snap) }
                                        .setNegativeButton("Cancel", null).show()
                                } else joinFirestoreRoom(code, snap)
                            }.addOnFailureListener { showHud("Room join failed: ${it.message}") }
                        }
                    }.setNegativeButton("Cancel", null).show()
            }
            if (auth.currentUser != null) continueWithUser(auth.currentUser!!.uid)
            else auth.signInAnonymously().addOnSuccessListener { result ->
                result.user?.uid?.let(continueWithUser) ?: showHud("Firebase anonymous sign-in returned no user")
            }.addOnFailureListener { showHud("Firebase sign-in failed: ${it.message}") }
        } catch (e: Exception) { showHud("Co-Watch setup error: ${e.message}") }
    }

    private fun getOrCreateFirebaseApp(): FirebaseApp {
        if (FirebaseApp.getApps(this).none { it.name == "cinemorph" }) {
            val options = FirebaseOptions.Builder().setApiKey(BuildConfig.FIREBASE_API_KEY)
                .setApplicationId(BuildConfig.FIREBASE_APP_ID).setProjectId(BuildConfig.FIREBASE_PROJECT_ID).build()
            FirebaseApp.initializeApp(this, options, "cinemorph")
        }
        return FirebaseApp.getInstance("cinemorph")
    }

    private fun joinFirestoreRoom(code: String, snapshot: com.google.firebase.firestore.DocumentSnapshot) {
        // A participant joining an existing room must never retain host privileges
        // from a room created earlier in this player session.
        isRoomHost = false
        roomCode = code
        val positionSeconds = snapshot.getDouble("currentTime") ?: 0.0
        player?.seekTo((positionSeconds * 1000).toLong().coerceAtLeast(0L))
        if (snapshot.getBoolean("isPlaying") == true) player?.play() else player?.pause()
        val uid = roomAuthUid
        if (uid != null) {
            val participants = (snapshot.get("participants") as? List<*>)?.filterIsInstance<Map<String, Any>>()?.toMutableList() ?: mutableListOf()
            if (participants.none { it["uid"] == uid }) {
                participants.add(mapOf("uid" to uid, "name" to "Guest", "joinedAt" to isoNow(), "isHost" to false))
                roomRef?.update(mapOf("participants" to participants, "activeUserCount" to participants.size, "lastUpdated" to System.currentTimeMillis()))
            }
        }
        attachRoomListener()
        showCoWatchChat(code)
        showHud("Joined Co-Watch room $code")
    }

    private fun attachRoomListener() {
        roomListener?.remove()
        val ref = roomRef ?: return
        roomListener = ref.addSnapshotListener { snapshot, error ->
            if (error != null) { showHud("Co-Watch sync: ${error.message}"); return@addSnapshotListener }
            if (isRoomHost || snapshot == null || !snapshot.exists()) return@addSnapshotListener
            val posSeconds = snapshot.getDouble("currentTime") ?: return@addSnapshotListener
            val remoteMs = (posSeconds * 1000).toLong()
            isApplyingRemoteState = true
            if (abs((player?.currentPosition ?: 0L) - remoteMs) > 1500) player?.seekTo(remoteMs)
            if (snapshot.getBoolean("isPlaying") == true) player?.play() else player?.pause()
            isApplyingRemoteState = false
        }
    }

    private fun publishPlayback() {
        val ref = roomRef ?: return
        if (!isRoomHost || isApplyingRemoteState) return
        val now = System.currentTimeMillis()
        if (now - lastRemoteUpdate < 1800) return
        lastRemoteUpdate = now
        ref.update(mapOf("currentTime" to ((player?.currentPosition ?: 0L) / 1000.0),
            "isPlaying" to (player?.isPlaying ?: false), "updatedAt" to isoNow(), "lastUpdated" to now))
    }

    private fun showCoWatchChat(code: String) {
        val ref = roomRef ?: return
        val uid = roomAuthUid ?: FirebaseAuth.getInstance(getOrCreateFirebaseApp()).currentUser?.uid ?: return
        val db = FirebaseFirestore.getInstance(getOrCreateFirebaseApp(), BuildConfig.FIRESTORE_DATABASE_ID)
        val messagesRef = db.collection("cowatch_rooms").document(code).collection("messages")
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 12, 24, 0) }
        val messages = TextView(this).apply { textSize = 14f; minHeight = 140; text = "Room $code\nConnecting chat…" }
        val input = EditText(this).apply { hint = "Message (max 500 characters)" }
        layout.addView(messages); layout.addView(input)
        chatListener?.remove()
        chatListener = messagesRef.orderBy("timestamp", Query.Direction.ASCENDING).limitToLast(30)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { messages.text = "Room $code\nChat error: ${error.message}"; return@addSnapshotListener }
                val lines = snapshot?.documents.orEmpty().map { doc ->
                    val sender = doc.getString("senderName") ?: "Guest"
                    val text = doc.getString("text") ?: ""
                    "$sender: $text"
                }
                messages.text = "Room $code\n" + lines.joinToString("\n")
            }
        AlertDialog.Builder(this).setTitle("Co-Watch · $code").setView(layout)
            .setPositiveButton("Send") { _, _ ->
                val text = input.text.toString().trim().take(500)
                if (text.isNotEmpty()) {
                    val payload = mapOf("roomId" to code, "senderId" to uid,
                        "senderName" to (getSharedPreferences("player_prefs", MODE_PRIVATE).getString("cowatch_name", "Guest") ?: "Guest").take(64),
                        "text" to text, "timestamp" to isoNow())
                    messagesRef.add(payload).addOnFailureListener { showHud("Message send failed: ${it.message}") }
                }
            }.setNeutralButton("Invite") { _, _ ->
                val share = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "Join my CineMorph Co-Watch room: $code")
                startActivity(Intent.createChooser(share, "Invite friend"))
            }.setNegativeButton("Close") { _, _ -> chatListener?.remove(); chatListener = null }.show()
    }

    private fun isoNow(): String {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        format.timeZone = TimeZone.getTimeZone("UTC")
        return format.format(Date())
    }

    private fun saveHistory() {
        val p = player ?: return
        val prefs = getSharedPreferences("watch_history", MODE_PRIVATE)
        val key = videoUri.toString()
        val name = queryName(videoUri).ifBlank { "Video" }
        val old = prefs.getString("items", "")!!.split("\n").filter { it.isNotBlank() && !it.startsWith("$key\t") }
        val record = "$key\t$name\t${p.currentPosition}\t${System.currentTimeMillis()}\t${p.duration}\t$targetLanguage"
        prefs.edit().putString("items", (listOf(record) + old).take(10).joinToString("\n")).apply()
        saveFirestoreHistory(name, key, p.currentPosition, p.duration)
    }

    private fun saveFirestoreHistory(name: String, uri: String, positionMs: Long, durationMs: Long) {
        if (BuildConfig.FIREBASE_API_KEY.isBlank() || BuildConfig.FIREBASE_APP_ID.isBlank() || BuildConfig.FIREBASE_PROJECT_ID.isBlank() || BuildConfig.FIRESTORE_DATABASE_ID.isBlank()) return
        try {
            val app = getOrCreateFirebaseApp()
            val auth = FirebaseAuth.getInstance(app)
            val writeProgress: (String) -> Unit = { uid ->
                val id = Integer.toHexString(uri.hashCode())
                val percent = if (durationMs > 0 && durationMs != C.TIME_UNSET) ((positionMs * 100.0 / durationMs).toInt()).coerceIn(0, 100) else 0
                val payload = mapOf<String, Any>("userId" to uid, "movieId" to id, "progressSeconds" to positionMs / 1000,
                    "progressPercent" to percent, "lastWatchedAt" to isoNow(), "targetLang" to targetLanguage,
                    "subtitleDriftMs" to subtitleOffsetMs)
                FirebaseFirestore.getInstance(app, BuildConfig.FIRESTORE_DATABASE_ID).collection("users").document(uid)
                    .collection("watch_progress").document(id).set(payload)
            }
            if (auth.currentUser != null) writeProgress(auth.currentUser!!.uid)
            else if (!historyAuthPending) {
                historyAuthPending = true
                auth.signInAnonymously().addOnSuccessListener { result ->
                    historyAuthPending = false
                    result.user?.uid?.let(writeProgress)
                }.addOnFailureListener { historyAuthPending = false }
            }
        } catch (_: Exception) { /* Local history remains available if Firebase is not configured. */ }
    }

    private fun queryName(uri: Uri): String {
        try { contentResolver.query(uri, null, null, null, null)?.use { c ->
            val i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (i >= 0 && c.moveToFirst()) return c.getString(i) ?: ""
        } } catch (_: Exception) {}
        return uri.lastPathSegment ?: ""
    }

    private fun fmt(ms: Long): String {
        val s = ms / 1000; val h = s / 3600; val m = s % 3600 / 60; val x = s % 60
        return if (h > 0) "%d:%02d:%02d".format(h, m, x) else "%02d:%02d".format(m, x)
    }
    private val hideHud = Runnable { hud.visibility = View.GONE }
    private fun showHud(text: String) {
        hud.text = text; hud.visibility = View.VISIBLE
        handler.removeCallbacks(hideHud); handler.postDelayed(hideHud, 2200)
    }

    override fun onStop() {
        super.onStop()
        player?.let { getSharedPreferences("resume", MODE_PRIVATE).edit().putLong(videoUri.toString(), it.currentPosition).apply(); saveHistory(); it.pause() }
        stopVoiceRecognition()
    }
    override fun onDestroy() {
        handler.removeCallbacks(subtitleTicker)
        roomListener?.remove(); roomListener = null
        chatListener?.remove(); chatListener = null
        player?.release(); player = null
        speechRecognizer?.destroy(); speechRecognizer = null
        tts?.stop(); tts?.shutdown(); tts = null
        dubTranslator?.close(); dubTranslator = null
        super.onDestroy()
    }
}

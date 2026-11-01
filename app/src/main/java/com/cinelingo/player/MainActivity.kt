package com.cinelingo.player

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.view.Gravity
import android.view.View
import android.widget.*
import android.text.Editable
import android.text.TextWatcher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private data class Video(val uri: Uri, val name: String, val duration: Long, val size: Long, val date: Long, val folder: String)
    private val videos = mutableListOf<Video>()
    private lateinit var list: LinearLayout
    private lateinit var count: TextView
    private lateinit var search: EditText
    private lateinit var categoryBar: LinearLayout
    private var selectedCategory = "All videos"
    private var selectedFolder: String? = null
    private var sortMode = "Date"
    private val selectedVideoUris = linkedSetOf<String>()
    private lateinit var selectionBar: LinearLayout
    private var selectionMode = false
    private lateinit var permissionPanel: LinearLayout
    private val micPermissionRequest = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        updatePermissionPanel()
        Toast.makeText(this, if (granted) "Microphone enabled for voice controls" else "Voice controls need microphone permission", Toast.LENGTH_LONG).show()
    }

    private val permissionRequest = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        updatePermissionPanel()
        if (granted) loadVideos() else showPermissionMessage()
    }
    private val pickVideo = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) {}
            openPlayer(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildScreen()
        val firstRun = showFirstRunSetupIfNeeded()
        updatePermissionPanel()
        if (!firstRun) ensureVideoPermission()
    }

    override fun onResume() { super.onResume(); if (::permissionPanel.isInitialized) updatePermissionPanel(); if (hasVideoPermission()) loadVideos() }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun rounded(color: Int, radius: Int, stroke: Int = 0): GradientDrawable = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat()
        if (stroke != 0) setStroke(dp(1), stroke)
    }
    private fun label(textValue: String, size: Float, color: Int, bold: Boolean = false): TextView = TextView(this).apply {
        text = textValue; textSize = size; setTextColor(color)
        if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
    }
    private fun buildScreen() {
        val bg = 0xff090d18.toInt(); val panel = 0xff151d2e.toInt(); val muted = 0xff9ba8bf.toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(18), dp(18), dp(18), dp(12))
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(0xff101a30.toInt(), bg, 0xff090d18.toInt()))
        }
        val header = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val brand = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; layoutParams = LinearLayout.LayoutParams(0, -2, 1f) }
        brand.addView(label("CINEMORPH", 23f, Color.WHITE, true))
        brand.addView(label("AI  •  YOUR PERSONAL CINEMA", 10f, 0xff8fa5c9.toInt(), true))
        header.addView(brand)
        header.addView(TextView(this).apply {
            text = "✦ AI"; textSize = 13f; setTextColor(0xffd8d2ff.toInt()); gravity = Gravity.CENTER
            setPadding(dp(14), dp(9), dp(14), dp(9)); background = rounded(0xff292449.toInt(), 18, 0xff6554b8.toInt())
        })
        root.addView(header)
        permissionPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(13), dp(10), dp(13), dp(10))
            background = rounded(0xff151d2e.toInt(), 16, 0xff34415d.toInt())
        }
        root.addView(permissionPanel, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(14) })
        // Compact CineMorph Banner (15-20% height with Tagline & Actions)
        val hero = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(14), dp(12), dp(14), dp(12));
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(0xff2d2654.toInt(), 0xff1b1938.toInt(), 0xff121226.toInt())).apply { cornerRadius = dp(16).toFloat() }
        }
        val heroTop = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        heroTop.addView(label("🎬  CINEMORPH AI", 11f, 0xffd9d4ff.toInt(), true), LinearLayout.LayoutParams(0, -2, 1f))
        heroTop.addView(label("Movies. Music. Magic.", 11f, 0xffc7b8ff.toInt(), true))
        hero.addView(heroTop)

        val heroActions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(10), 0, 0) }
        val browse = Button(this).apply { text = "＋  Browse Files"; isAllCaps = false; textSize = 11f; setTextColor(Color.WHITE); background = rounded(0xff6853e8.toInt(), 12); setOnClickListener { pickVideo.launch(arrayOf("video/*")) } }
        heroActions.addView(browse, LinearLayout.LayoutParams(0, dp(38), 1f).apply { marginEnd = dp(8) })
        val studio = Button(this).apply { text = "✦  AI Studio  ↗"; isAllCaps = false; textSize = 11f; setTextColor(0xffe8e5ff.toInt()); background = rounded(0xff2d2859.toInt(), 12, 0xff6252d6.toInt()); setOnClickListener { openFullStudioDialog() } }
        heroActions.addView(studio, LinearLayout.LayoutParams(0, dp(38), 1f))
        hero.addView(heroActions); root.addView(hero, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(12) })

        val section = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(20), 0, dp(8)) }
        section.addView(label("MY LIBRARY", 12f, 0xffcbd6eb.toInt(), true), LinearLayout.LayoutParams(0, -2, 1f))
        count = label("Scanning videos…", 11f, muted); section.addView(count)
        val sortButton = TextView(this).apply {
            text = "  ⇅ Sort  "; textSize = 11f; setTextColor(0xffd9d4ff.toInt()); gravity = Gravity.CENTER
            setOnClickListener { val options = arrayOf("Date (newest)", "Name (A–Z)", "Size (largest)")
                AlertDialog.Builder(this@MainActivity).setTitle("Sort videos")
                    .setSingleChoiceItems(options, when(sortMode) { "Name" -> 1; "Size" -> 2; else -> 0 }) { d, which ->
                        sortMode = when(which) { 1 -> "Name"; 2 -> "Size"; else -> "Date" }; d.dismiss(); renderVideos()
                    }.show()
            }
        }
        section.addView(sortButton); root.addView(section)
        search = EditText(this).apply {
            hint = "⌕   Search movies and folders"; setSingleLine(true); textSize = 14f; setTextColor(Color.WHITE); setHintTextColor(0xff8190aa.toInt())
            setPadding(dp(15), 0, dp(15), 0); background = rounded(panel, 15, 0xff293650.toInt())
        }
        root.addView(search, LinearLayout.LayoutParams(-1, dp(50)).apply { bottomMargin = dp(12) })
        categoryBar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        root.addView(categoryBar, LinearLayout.LayoutParams(-1, dp(44)).apply { bottomMargin = dp(4) })
        selectionBar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; visibility = View.GONE }
        root.addView(selectionBar, LinearLayout.LayoutParams(-1, dp(48)).apply { bottomMargin = dp(6) })
        val scroll = ScrollView(this).apply { isFillViewport = false; clipToPadding = false }
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(4), 0, dp(12)) }
        scroll.addView(list)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        search.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { renderVideos() }
            override fun afterTextChanged(s: Editable?) {}
        })
        setContentView(root)
    }

    private fun showFirstRunSetupIfNeeded(): Boolean {
        val prefs = getSharedPreferences("permission_setup", MODE_PRIVATE)
        if (prefs.getBoolean("intro_shown", false)) return false
        AlertDialog.Builder(this)
            .setTitle("Welcome to CineMorph AI")
            .setMessage("Let's set up the permissions needed by your player. Android will show its own permission dialog for each item. Video access is needed for your library. Microphone is optional and is used only for voice commands. You can change permissions later in Android Settings.")
            .setPositiveButton("Continue") { _, _ -> prefs.edit().putBoolean("intro_shown", true).apply(); requestVideoAccessIfNeeded() }
            .setNegativeButton("Not now") { _, _ -> prefs.edit().putBoolean("intro_shown", true).apply() }
            .setOnDismissListener { updatePermissionPanel() }
            .show()
        return true
    }

    private fun requestVideoAccessIfNeeded() {
        if (!hasVideoPermission()) permissionRequest.launch(videoPermission())
        else loadVideos()
    }

    private fun updatePermissionPanel() {
        if (!::permissionPanel.isInitialized) return
        if (hasVideoPermission()) {
            permissionPanel.visibility = View.GONE
            return
        }
        permissionPanel.visibility = View.VISIBLE
        permissionPanel.removeAllViews()
        permissionPanel.addView(label("APP PERMISSIONS", 11f, 0xffd6dcff.toInt(), true))
        permissionPanel.addView(label("Only permissions used by CineMorph AI are listed here.", 10f, 0xff9ba8bf.toInt()).apply { setPadding(0, dp(3), 0, dp(8)) })
        addPermissionRow("Video & library access", hasVideoPermission(), "Required to scan and show videos", "Grant") {
            if (!hasVideoPermission()) permissionRequest.launch(videoPermission()) else Toast.makeText(this, "Video access already allowed", Toast.LENGTH_SHORT).show()
        }
        val micGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        addPermissionRow("Microphone", micGranted, "Optional · voice commands in the player", if (micGranted) "Allowed" else "Allow") {
            if (!micGranted) micPermissionRequest.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun addPermissionRow(title: String, granted: Boolean?, detail: String, action: String, onClick: () -> Unit) {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(5), 0, dp(5)) }
        val info = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; layoutParams = LinearLayout.LayoutParams(0, -2, 1f) }
        info.addView(label(title, 12f, Color.WHITE, true))
        info.addView(label(detail, 10f, 0xff9ba8bf.toInt()).apply { setPadding(0, dp(2), 0, 0) })
        row.addView(info)
        val status = when (granted) { true -> "✓ Allowed"; false -> "Not allowed"; null -> "Not needed" }
        val statusColor = if (granted == true) 0xff75d6a0.toInt() else 0xffc5cce0.toInt()
        row.addView(label(status, 10f, statusColor, true).apply { setPadding(dp(6), 0, dp(8), 0) })
        val button = TextView(this).apply {
            text = action; textSize = 10f; gravity = Gravity.CENTER
            setTextColor(Color.WHITE); setPadding(dp(10), dp(7), dp(10), dp(7))
            background = rounded(0xff554ca8.toInt(), 10)
            setOnClickListener { onClick() }
        }
        row.addView(button)
        permissionPanel.addView(row)
    }

    private fun videoPermission(): String = if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_VIDEO else Manifest.permission.READ_EXTERNAL_STORAGE
    private fun hasVideoPermission() = ContextCompat.checkSelfPermission(this, videoPermission()) == PackageManager.PERMISSION_GRANTED
    private fun ensureVideoPermission() { if (hasVideoPermission()) loadVideos() else permissionRequest.launch(videoPermission()) }

    private fun showPermissionMessage() {
        list.removeAllViews()
        list.addView(TextView(this).apply { text = "To show videos stored on your phone, allow CineMorph AI to access photos and videos. Your files stay on this device."; textSize = 16f; setPadding(0, 24, 0, 24) })
        list.addView(Button(this).apply { text = "Allow video access"; setOnClickListener { ensureVideoPermission() } })
    }

    private fun loadVideos() {
        videos.clear()
        val projection = if (Build.VERSION.SDK_INT >= 29) arrayOf(
            MediaStore.Video.Media._ID, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.SIZE, MediaStore.Video.Media.DATE_ADDED, MediaStore.Video.Media.RELATIVE_PATH
        ) else arrayOf(
            MediaStore.Video.Media._ID, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.SIZE, MediaStore.Video.Media.DATE_ADDED
        )
        val sort = "${MediaStore.Video.Media.DATE_ADDED} DESC"
        try {
            contentResolver.query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, projection, null, null, sort)?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)
                val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_ADDED)
                val pathCol = cursor.getColumnIndex(MediaStore.Video.Media.RELATIVE_PATH)
                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val uri = Uri.withAppendedPath(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id.toString())
                    val path = if (pathCol >= 0) cursor.getString(pathCol).orEmpty().trimEnd('/') else "Videos"
                    val folder = if (pathCol >= 0) path.substringAfterLast('/').ifBlank { "Videos" } else "Videos"
                    videos.add(Video(uri, cursor.getString(nameCol) ?: "Video", cursor.getLong(durationCol), cursor.getLong(sizeCol), cursor.getLong(dateCol), folder))
                }
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Could not read video library: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
        buildCategories()
        renderVideos()
    }

    private fun buildCategories() {
        categoryBar.removeAllViews()
        listOf("All videos", "Folders", "Recent", "Large").forEach { category ->
            val selected = selectedCategory == category
            categoryBar.addView(TextView(this).apply {
                text = category; textSize = 11f; gravity = Gravity.CENTER; isAllCaps = false
                setTextColor(if (selected) Color.WHITE else 0xffaab6cc.toInt())
                setPadding(dp(12), 0, dp(12), 0)
                background = rounded(if (selected) 0xff6659d7.toInt() else 0xff172135.toInt(), 18, if (selected) 0xff887cf1.toInt() else 0xff293650.toInt())
                setOnClickListener { selectedCategory = category; selectedFolder = null; buildCategories(); renderVideos() }
            }, LinearLayout.LayoutParams(0, dp(36), 1f).apply { marginEnd = dp(5) })
        }
    }

    private fun renderVideos() {
        if (!::list.isInitialized) return
        list.removeAllViews()
        val query = search.text?.toString()?.trim()?.lowercase(Locale.ROOT).orEmpty()
        if (selectedFolder != null) {
            list.addView(Button(this).apply { text = "← All folders"; isAllCaps = false; setOnClickListener { selectedFolder = null; selectedCategory = "Folders"; selectionMode = false; selectedVideoUris.clear(); buildCategories(); renderVideos() } })
        }
        var filtered = videos.filter { (selectedFolder == null || it.folder == selectedFolder) && (it.name.lowercase(Locale.ROOT).contains(query) || it.folder.lowercase(Locale.ROOT).contains(query)) }
        when (selectedCategory) {
            "Recent" -> filtered = filtered.sortedByDescending { it.date }.take(30)
            "Large" -> filtered = filtered.sortedByDescending { it.size }
            "Folders" -> {
                val folders = filtered.groupBy { it.folder }.toSortedMap()
                count.text = "${folders.size} folders · ${filtered.size} videos"
                folders.forEach { (folder, items) ->
                    list.addView(Button(this).apply {
                        text = "📁  $folder  ·  ${items.size} videos   ›"; isAllCaps = false; gravity = Gravity.START; setTextColor(Color.WHITE); background = rounded(0xff151e30.toInt(), 15, 0xff293650.toInt()); setPadding(dp(14), dp(8), dp(14), dp(8))
                        setOnClickListener { selectedFolder = folder; selectedCategory = "All videos"; showFolderVideos(folder) }
                    })
                }
                if (folders.isEmpty()) emptyMessage()
                return
            }
        }
        filtered = when (sortMode) {
            "Name" -> filtered.sortedBy { it.name.lowercase(Locale.ROOT) }
            "Size" -> filtered.sortedByDescending { it.size }
            else -> filtered.sortedByDescending { it.date }
        }
        count.text = "${filtered.size} videos · Sort: $sortMode"
        updateSelectionBar(filtered)
        filtered.forEachIndexed { index, video ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(13), dp(12), dp(12), dp(12)); background = rounded(0xff151e30.toInt(), 17, 0xff27344d.toInt())
                setOnClickListener { openPlayer(video.uri) }
            }
            val poster = TextView(this).apply {
                text = "▶"; textSize = 22f; gravity = Gravity.CENTER; setTextColor(0xffd9d4ff.toInt())
                background = rounded(0xff302b59.toInt(), 13); layoutParams = LinearLayout.LayoutParams(dp(54), dp(58))
            }
            val check = TextView(this).apply {
                text = if (selectedVideoUris.contains(video.uri.toString())) "☑" else "□"
                textSize = 20f; gravity = Gravity.CENTER; setTextColor(if (selectedVideoUris.contains(video.uri.toString())) 0xffa99cff.toInt() else 0xff8290aa.toInt())
                visibility = if (selectionMode) View.VISIBLE else View.GONE
                layoutParams = LinearLayout.LayoutParams(dp(30), dp(58)).apply { marginEnd = dp(6) }
                setOnClickListener { if (!selectionMode) selectionMode = true; toggleVideoSelection(video.uri) }
            }
            card.addView(check)
            card.addView(poster)
            val details = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), 0, 0, 0); layoutParams = LinearLayout.LayoutParams(0, -2, 1f) }
            details.addView(label(video.name, 14f, Color.WHITE, true))
            details.addView(label("${video.folder}  •  ${formatDuration(video.duration)}", 11f, 0xff9eabc2.toInt()).apply { setPadding(0, dp(5), 0, 0) })
            val resumeMs = getSharedPreferences("resume", MODE_PRIVATE).getLong(video.uri.toString(), 0L)
            if (resumeMs > 5000L) details.addView(label("▶ Resume ${formatDuration(resumeMs)}", 10f, 0xffa99cff.toInt()).apply { setPadding(0, dp(3), 0, 0) })
            details.addView(label(formatSize(video.size), 10f, 0xff71819e.toInt()).apply { setPadding(0, dp(3), 0, 0) })
            card.addView(details)
            card.addView(label("›", 25f, 0xff9e91ff.toInt()))
            list.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(9) })
        }
        if (filtered.isEmpty()) emptyMessage()
        updateSelectionBar(filtered)
    }

    private fun toggleVideoSelection(uri: Uri) {
        val key = uri.toString()
        if (!selectedVideoUris.add(key)) selectedVideoUris.remove(key)
        if (selectedVideoUris.isEmpty()) selectionMode = false
        renderVideos()
    }

    private fun updateSelectionBar(filtered: List<Video>) {
        if (!::selectionBar.isInitialized) return
        selectionBar.removeAllViews()
        selectionBar.visibility = if (selectionMode) View.VISIBLE else View.GONE
        if (!selectionMode) return
        val visibleUris = filtered.map { it.uri.toString() }
        val allSelected = visibleUris.isNotEmpty() && visibleUris.all { selectedVideoUris.contains(it) }
        val selectAll = Button(this).apply {
            text = if (allSelected) "Unselect all" else "Select all"; isAllCaps = false; textSize = 10f
            setOnClickListener {
                if (allSelected) selectedVideoUris.removeAll(visibleUris.toSet()) else selectedVideoUris.addAll(visibleUris)
                if (selectedVideoUris.isEmpty()) selectionMode = false
                renderVideos()
            }
        }
        selectionBar.addView(selectAll, LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginEnd = dp(5) })
        selectionBar.addView(label("${selectedVideoUris.size} selected", 11f, Color.WHITE, true).apply { gravity = Gravity.CENTER }, LinearLayout.LayoutParams(0, -2, 1f))
        val trash = Button(this).apply {
            text = "Move to Bin"; isAllCaps = false; textSize = 10f
            setOnClickListener { requestBulkMediaAction(trash = true) }
        }
        selectionBar.addView(trash, LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginStart = dp(5); marginEnd = dp(5) })
        val delete = Button(this).apply {
            text = "Delete"; isAllCaps = false; textSize = 10f
            setOnClickListener { requestBulkMediaAction(trash = false) }
        }
        selectionBar.addView(delete, LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginStart = dp(5) })
    }

    private fun requestBulkMediaAction(trash: Boolean) {
        val targets = selectedVideoUris.mapNotNull { raw -> videos.firstOrNull { it.uri.toString() == raw }?.uri }
        if (targets.isEmpty()) { selectionMode = false; renderVideos(); return }
        val actionName = if (trash) "move to Recycle Bin" else "permanently delete"
        AlertDialog.Builder(this)
            .setTitle(if (trash) "Move selected videos to Bin?" else "Delete selected videos permanently?")
            .setMessage("${targets.size} selected video(s) will be ${actionName}. Android will ask you to approve this action.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton(if (trash) "Move to Bin" else "Delete") { _, _ -> launchMediaStoreAction(targets, trash) }
            .show()
    }

    private fun launchMediaStoreAction(targets: List<Uri>, trash: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val pending = if (trash) MediaStore.createTrashRequest(contentResolver, targets, true)
                    else MediaStore.createDeleteRequest(contentResolver, targets)
                startIntentSenderForResult(pending.intentSender, if (trash) 7101 else 7102, null, 0, 0, 0)
            } catch (e: Exception) {
                Toast.makeText(this, "Could not start Android media permission: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        } else {
            Toast.makeText(this, "Bulk recycle requires Android 11 or newer. Use Android's file manager on this device.", Toast.LENGTH_LONG).show()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 7101 || requestCode == 7102) {
            if (resultCode == RESULT_OK) Toast.makeText(this, if (requestCode == 7101) "Selected videos moved to Recycle Bin" else "Selected videos permanently deleted", Toast.LENGTH_LONG).show()
            else Toast.makeText(this, "No files changed", Toast.LENGTH_SHORT).show()
            selectedVideoUris.clear()
            selectionMode = false
            loadVideos()
        }
    }

    private fun showFolderVideos(folder: String) {
        selectedFolder = folder
        selectedCategory = "All videos"
        renderVideos()
    }

    private fun emptyMessage() { list.addView(TextView(this).apply { text = if (videos.isEmpty()) "No videos found. Download or save a video on your phone, then refresh this screen." else "No matching videos."; textSize = 15f; setPadding(8, 24, 8, 24) }) }
    private fun openPlayer(uri: Uri) {
        val current = videos.firstOrNull { it.uri == uri }
        val playlist = if (current != null) videos.filter { it.folder == current.folder }.sortedByDescending { it.date } else listOf(current).filterNotNull()
        val uris = ArrayList(playlist.map { it.uri.toString() })
        val index = uris.indexOf(uri.toString()).coerceAtLeast(0)
        startActivity(Intent(this, PlayerActivity::class.java).apply {
            data = uri
            putStringArrayListExtra("playlist_uris", uris)
            putExtra("playlist_index", index)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        })
    }
    private fun formatDuration(ms: Long): String { val s = ms / 1000; return String.format(Locale.ROOT, "%d:%02d", s / 60, s % 60) }
    private fun formatSize(bytes: Long): String = if (bytes >= 1024L * 1024L * 1024L) String.format(Locale.ROOT, "%.1f GB", bytes / (1024.0 * 1024 * 1024)) else String.format(Locale.ROOT, "%.0f MB", bytes / (1024.0 * 1024))

    private fun openFullStudioDialog() {
        val prefs = getSharedPreferences("studio_settings", MODE_PRIVATE)
        val input = EditText(this).apply { hint = "https://your-cinemorph-site.example"; setSingleLine(true); setText(prefs.getString("url", "").orEmpty()); inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI }
        AlertDialog.Builder(this).setTitle("Full CineMorph AI Studio").setMessage("Enter your deployed web app HTTPS URL.").setView(input).setNegativeButton("Cancel", null).setNeutralButton("Clear saved URL") { _, _ -> prefs.edit().remove("url").apply() }.setPositiveButton("Open") { _, _ ->
            val raw = input.text.toString().trim().trimEnd('/')
            val uri = runCatching { Uri.parse(raw) }.getOrNull()
            if (uri == null || uri.scheme != "https" || uri.host.isNullOrBlank()) { Toast.makeText(this, "Please enter a valid HTTPS website URL", Toast.LENGTH_LONG).show(); return@setPositiveButton }
            prefs.edit().putString("url", raw).apply(); startActivity(Intent(this, WebStudioActivity::class.java).putExtra(WebStudioActivity.EXTRA_URL, raw))
        }.show()
    }
}

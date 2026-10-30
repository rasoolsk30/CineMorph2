package com.cinelingo.player

import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class CinemaStudioActivity : AppCompatActivity() {
    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun panel(): GradientDrawable = GradientDrawable().apply {
        setColor(0xff171f32.toInt()); cornerRadius = dp(18).toFloat()
        setStroke(dp(1), 0xff35415e.toInt())
    }
    private fun text(value: String, size: Float, color: Int, bold: Boolean = false) =
        TextView(this).apply {
            text = value; textSize = size; setTextColor(color)
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
    private val pickVideo = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) {}
            startActivity(Intent(this, PlayerActivity::class.java).apply {
                data = uri
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            })
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(26), dp(22), dp(20))
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xff171b35.toInt(), 0xff090d18.toInt(), 0xff10182b.toInt()))
        }
        val header = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val back = Button(this).apply {
            text = "←"; isAllCaps = false; setTextColor(Color.WHITE)
            background = panel(); setOnClickListener { finish() }
        }
        header.addView(back)
        val title = text("  CINEMA STUDIO", 20f, Color.WHITE, true)
        header.addView(title)
        root.addView(header)
        root.addView(text("Your personal movie workspace", 13f, 0xffaab7d0.toInt()).apply {
            setPadding(0, dp(8), 0, dp(22))
        })
        val webCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(17), dp(17), dp(17), dp(17)); background = panel()
        }
        webCard.addView(text("✦  AI STUDIO", 15f, 0xffe3ddff.toInt(), true))
        webCard.addView(text("Open your deployed CineMorph web companion for its AI tools. This needs a working HTTPS deployment URL.", 12f, 0xffaab7d0.toInt()).apply { setPadding(0, dp(8), 0, dp(12)) })
        webCard.addView(Button(this).apply {
            text = "Configure / Open AI Studio"; isAllCaps = false
            setOnClickListener { configureAndOpenWebStudio() }
        })
        root.addView(webCard)
        val localCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(17), dp(17), dp(17), dp(17)); background = panel()
        }
        localCard.addView(text("▶  LOCAL CINEMA", 15f, 0xffe3ddff.toInt(), true))
        localCard.addView(text("Choose a video stored on your phone and open it in the native CineMorph player. Video editing tools are being kept for the next phase.", 12f, 0xffaab7d0.toInt()).apply { setPadding(0, dp(8), 0, dp(12)) })
        localCard.addView(Button(this).apply {
            text = "Choose a video"; isAllCaps = false
            setOnClickListener { pickVideo.launch(arrayOf("video/*")) }
        })
        val lp = LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(14) }
        root.addView(localCard, lp)
        root.addView(webCard, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(14) })
        setContentView(root)
    }

    private fun configureAndOpenWebStudio() {
        val prefs = getSharedPreferences("studio_settings", MODE_PRIVATE)
        val input = EditText(this).apply {
            hint = "https://your-cinemorph-site.example"
            setSingleLine(true); setText(prefs.getString("url", "").orEmpty())
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
        }
        AlertDialog.Builder(this).setTitle("CineMorph AI Studio")
            .setMessage("Enter the deployed web app HTTPS URL.")
            .setView(input).setNegativeButton("Cancel", null)
            .setNeutralButton("Clear URL") { _, _ -> prefs.edit().remove("url").apply() }
            .setPositiveButton("Open") { _, _ ->
                val raw = input.text.toString().trim().trimEnd('/')
                val uri = runCatching { Uri.parse(raw) }.getOrNull()
                if (uri == null || uri.scheme != "https" || uri.host.isNullOrBlank()) {
                    Toast.makeText(this, "Enter a valid HTTPS URL", Toast.LENGTH_LONG).show()
                    return@setPositiveButton
                }
                prefs.edit().putString("url", raw).apply()
                startActivity(Intent(this, WebStudioActivity::class.java).putExtra(WebStudioActivity.EXTRA_URL, raw))
            }.show()
    }
}

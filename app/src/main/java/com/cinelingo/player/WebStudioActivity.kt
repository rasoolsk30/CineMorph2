package com.cinelingo.player

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/** Loads the deployed React companion so web-only AI Studio tabs can be used inside the Android app. */
class WebStudioActivity : AppCompatActivity() {
    companion object { const val EXTRA_URL = "studio_url" }
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = intent.getStringExtra(EXTRA_URL)
            ?: getSharedPreferences("studio_settings", MODE_PRIVATE).getString("url", null)
        if (url.isNullOrBlank() || !url.startsWith("https://")) {
            Toast.makeText(this, "Set a valid HTTPS Studio URL from the home screen", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val target = request.url
                    // Keep HTTPS navigation in the app. Do not permit cleartext HTTP navigation.
                    if (target.scheme != "https") {
                        Toast.makeText(this@WebStudioActivity, "Only secure HTTPS pages are allowed", Toast.LENGTH_SHORT).show()
                        return true
                    }
                    return false
                }
            }
        }
        setContentView(webView)
        webView.loadUrl(url)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }
}

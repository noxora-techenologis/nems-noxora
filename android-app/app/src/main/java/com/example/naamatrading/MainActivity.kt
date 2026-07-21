package com.example.naamatrading

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set native Android Status Bar & Navigation Bar color to match dark app theme
        window.statusBarColor = Color.parseColor("#08090C")
        window.navigationBarColor = Color.parseColor("#0A0B0E")

        webView = WebView(this)
        setContentView(webView)

        // Seamless dark background (no white flash during load)
        webView.setBackgroundColor(Color.parseColor("#0A0B0E"))
        webView.isHorizontalScrollBarEnabled = false
        webView.isVerticalScrollBarEnabled = false
        webView.isHapticFeedbackEnabled = true

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        // Direct 1:1 mobile rendering
        settings.useWideViewPort = false
        settings.loadWithOverviewMode = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Force mobile user agent
        settings.userAgentString =
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36"

        // Force 100% scale (no zoom-out)
        webView.setInitialScale(100)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                view.loadUrl(request.url.toString())
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                // Ensure viewport meta tag is enforced
                val js = """
                    (function() {
                        var existingMeta = document.querySelector('meta[name="viewport"]');
                        if (existingMeta) {
                            existingMeta.setAttribute('content',
                                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
                        } else {
                            var meta = document.createElement('meta');
                            meta.name = 'viewport';
                            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
                            document.head.appendChild(meta);
                        }
                    })();
                """.trimIndent()
                view.evaluateJavascript(js, null)
            }
        }

        webView.webChromeClient = WebChromeClient()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        webView.loadUrl("http://192.168.100.110:3000")
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }
}


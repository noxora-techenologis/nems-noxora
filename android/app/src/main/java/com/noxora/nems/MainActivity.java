package com.noxora.nems;

import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout layoutLoading;
    private LinearLayout layoutError;
    private Button btnRetry;

    // Web application host url
    // In emulator: 10.0.2.2 points to host's localhost (3000 port of Next.js)
    private static final String APP_URL = "http://10.0.2.2:3000";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        layoutLoading = findViewById(R.id.layoutLoading);
        layoutError = findViewById(R.id.layoutError);
        btnRetry = findViewById(R.id.btnRetry);

        setupWebView();

        swipeRefresh.setOnRefreshListener(() -> {
            if (isNetworkAvailable()) {
                webView.reload();
            } else {
                swipeRefresh.setRefreshing(false);
                showError();
            }
        });

        btnRetry.setOnClickListener(v -> loadApp());

        loadApp();
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (!swipeRefresh.isRefreshing()) {
                    layoutLoading.setVisibility(View.VISIBLE);
                }
                layoutError.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                layoutLoading.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                swipeRefresh.setRefreshing(false);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                // Only trigger full error page for main frame requests
                if (request.isForMainFrame()) {
                    showError();
                }
            }
        });
    }

    private void loadApp() {
        if (isNetworkAvailable()) {
            layoutLoading.setVisibility(View.VISIBLE);
            layoutError.setVisibility(View.GONE);
            webView.loadUrl(APP_URL);
        } else {
            showError();
        }
    }

    private void showError() {
        layoutLoading.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        layoutError.setVisibility(View.VISIBLE);
        swipeRefresh.setRefreshing(false);
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm != null) {
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        }
        return false;
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

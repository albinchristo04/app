
package com.chaineenlive.app;

import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.widget.RelativeLayout;

import com.getcapacitor.BridgeActivity;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.widget.RelativeLayout;

import com.getcapacitor.BridgeActivity;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivityAds";
    private static final String UNITY_GAME_ID = "5955100";
    private static final String BANNER_AD_UNIT_ID = "banner";
    private static final String INTERSTITIAL_AD_UNIT_ID = "interstitial-android";
    private static final boolean TEST_MODE = false; // Mettre false en production

    private BannerView bannerView;
    private IUnityAdsLoadListener interstitialLoadListener;

    // --- JavaScript Interface for Ads ---
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void showInterstitialAd() {
            Log.d(TAG, "JavaScript called showInterstitialAd()");
            loadAndShowInterstitialAd();
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        android.webkit.WebView webView = getBridge().getWebView();

        // --- Webview Settings ---
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
            webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
        webView.getSettings().setAllowFileAccessFromFileURLs(true);
        // Enable JavaScript
        webView.getSettings().setJavaScriptEnabled(true);
        // Add JavaScript interface
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");

        // Initialize interstitial load listener
        interstitialLoadListener = new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                Log.d(TAG, "Interstitial Ad pre-loaded: " + placementId);
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                Log.e(TAG, "Interstitial Ad pre-load failed: [" + error + "] " + message);
            }
        };

        initializeUnityAds();
    }

    private void initializeUnityAds() {
        Log.d(TAG, "Initializing Unity Ads from MainActivity...");

        UnityAds.initialize(getApplicationContext(), UNITY_GAME_ID, TEST_MODE, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                Log.d(TAG, "Unity Ads initialization complete.");
                runOnUiThread(() -> {
                    showBannerAd();
                    UnityAds.load(INTERSTITIAL_AD_UNIT_ID, interstitialLoadListener); // Pre-load interstitial
                });
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                Log.e(TAG, "================================================================");
                Log.e(TAG, "UNITY ADS INITIALIZATION FAILED");
                Log.e(TAG, "Error: " + error);
                Log.e(TAG, "Message: " + message);
                Log.e(TAG, "================================================================");
            }
        });
    }

    private void showBannerAd() {
        if (bannerView != null && bannerView.getParent() != null) {
            ((ViewGroup) bannerView.getParent()).removeView(bannerView);
        }

        bannerView = new BannerView(this, BANNER_AD_UNIT_ID, new UnityBannerSize(320, 50));
        bannerView.setListener(new BannerView.IListener() {
            @Override
            public void onBannerLoaded(BannerView bn) {
                Log.d(TAG, "Banner loaded successfully.");
                bn.bringToFront();
                adjustWebViewMarginForBanner();
            }

            @Override
            public void onBannerFailedToLoad(BannerView bn, BannerErrorInfo errorInfo) {
                Log.e(TAG, "================================================================");
                Log.e(TAG, "UNITY BANNER FAILED TO LOAD");
                Log.e(TAG, "Placement ID: " + bn.getPlacementId());
                Log.e(TAG, "Error Info: " + errorInfo.errorMessage);
                Log.e(TAG, "================================================================");
            }

            @Override
            public void onBannerClick(BannerView bn) {}

            @Override
            public void onBannerShown(BannerView bn) {}

            @Override
            public void onBannerLeftApplication(BannerView bn) {}
        });

        RelativeLayout.LayoutParams bannerParams = new RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.WRAP_CONTENT,
            RelativeLayout.LayoutParams.WRAP_CONTENT
        );
        bannerParams.addRule(RelativeLayout.ALIGN_PARENT_BOTTOM);
        bannerParams.addRule(RelativeLayout.CENTER_HORIZONTAL);

        ViewGroup root = findViewById(android.R.id.content);
        if (root != null) {
            root.addView(bannerView, bannerParams);
            bannerView.load();
        }
        else {
            Log.e(TAG, "Root view not found, can't add banner.");
        }
    }

    private void adjustWebViewMarginForBanner() {
        runOnUiThread(() -> {
            android.view.View webView = getBridge().getWebView();
            if (webView != null) {
                ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) webView.getLayoutParams();
                int bannerHeight = (int) (50 * getResources().getDisplayMetrics().density);
                if (params.bottomMargin != bannerHeight) {
                    params.bottomMargin = bannerHeight;
                    webView.setLayoutParams(params);
                }
            }
        });
    }

    private void loadAndShowInterstitialAd() {
        Log.d(TAG, "On-demand Interstitial Ad triggered. Attempting to show...");
        runOnUiThread(() -> {
            UnityAds.show(MainActivity.this, INTERSTITIAL_AD_UNIT_ID, new IUnityAdsShowListener() {
                @Override
                public void onUnityAdsShowFailure(String pId, UnityAds.UnityAdsShowError error, String message) {
                    Log.e(TAG, "Interstitial Ad failed to show: [" + error + "] " + message);
                    triggerJsNavigation(); // Navigate if ad fails to show
                    // After failure, try to pre-load the next ad
                    UnityAds.load(INTERSTITIAL_AD_UNIT_ID, interstitialLoadListener);
                }

                @Override
                public void onUnityAdsShowStart(String pId) {
                    Log.d(TAG, "Interstitial Ad started: " + pId);
                }

                @Override
                public void onUnityAdsShowClick(String pId) {}

                @Override
                public void onUnityAdsShowComplete(String pId, UnityAds.UnityAdsShowCompletionState state) {
                    Log.d(TAG, "Interstitial Ad finished: " + pId);
                    triggerJsNavigation();
                    // After showing, try to pre-load the next ad
                    UnityAds.load(INTERSTITIAL_AD_UNIT_ID, interstitialLoadListener);
                }
            });
        });
    }

    private void triggerJsNavigation() {
        runOnUiThread(() -> {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript("if (typeof navigateAfterAd === 'function') { navigateAfterAd(); } else { console.error('navigateAfterAd function not found'); }", null);
            }
        });
    }

    @Override
    public void onDestroy() {
        if (bannerView != null) {
            bannerView.destroy();
            bannerView = null;
        }
        super.onDestroy();
    }
}

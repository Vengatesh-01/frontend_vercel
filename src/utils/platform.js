/**
 * Platform detection utility for Reelio
 * Helps distinguish between mobile app (WebView) and desktop browser
 */

export const isMobileApp = () => {
    // Check for common mobile WebView indicators
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Check if running inside potential Flutter WebView
    const isWebView = /wv|WebView|ReelioMobileApp/i.test(userAgent) ||
        (window.FlutterInterface !== undefined) ||
        (window.flutter_inappwebview !== undefined);

    // Instagram uses certain headers or window objects, 
    // we can also check for specific mobile OS
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    return isWebView || (isMobileDevice && window.innerWidth < 1024);
};

export const isDesktop = () => !isMobileApp();

export const getPlatform = () => isMobileApp() ? 'mobile-app' : 'desktop-web';

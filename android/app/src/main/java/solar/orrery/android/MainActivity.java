package solar.orrery.android;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String ANDROID_BACK_HANDLER =
        "(function(){return !!(window.__ORRERY_HANDLE_ANDROID_BACK__ && " +
        "window.__ORRERY_HANDLE_ANDROID_BACK__());})()";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                dispatchBackToWeb(this);
            }
        });
    }

    private void dispatchBackToWeb(OnBackPressedCallback callback) {
        if (bridge == null || bridge.getWebView() == null) {
            finishWithSystemBack(callback);
            return;
        }

        bridge.getWebView().evaluateJavascript(ANDROID_BACK_HANDLER, result -> {
            if (!didJavaScriptConsumeBack(result)) {
                runOnUiThread(() -> finishWithSystemBack(callback));
            }
        });
    }

    private void finishWithSystemBack(OnBackPressedCallback callback) {
        callback.setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
        callback.setEnabled(true);
    }

    static boolean didJavaScriptConsumeBack(String result) {
        return "true".equals(result);
    }
}

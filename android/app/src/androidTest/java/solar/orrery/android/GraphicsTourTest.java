package solar.orrery.android;

import android.app.KeyguardManager;
import android.content.Context;
import android.os.SystemClock;
import android.util.Log;
import android.view.WindowManager;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Same foreground workload for baseline and allocation-lifetime experiments. */
@RunWith(AndroidJUnit4.class)
public class GraphicsTourTest {
    private String evaluate(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, value -> {
            result.set(value);
            done.countDown();
        }));
        assertTrue("WebView callback", done.await(10, TimeUnit.SECONDS));
        return result.get();
    }

    @Test public void ambientTour() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertFalse("Unlock the Fire before running", context.getSystemService(KeyguardManager.class).isKeyguardLocked());
        int seconds = Integer.parseInt(InstrumentationRegistry.getArguments().getString("seconds", "600"));
        assertTrue("Bounded diagnostic duration", seconds >= 60 && seconds <= 3600);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
            long deadline = SystemClock.elapsedRealtime() + 60000;
            while (!"true".equals(evaluate(scenario, "!!document.querySelector('button[aria-label=\"Start ambient tour\"]')"))) {
                assertTrue("Tour control appeared", SystemClock.elapsedRealtime() < deadline);
                SystemClock.sleep(500);
            }
            // Dismiss only the first-run presentation, preserving all scene content.
            evaluate(scenario, "localStorage.setItem('orrery.cinematic-seen.v1','1')");
            assertEquals("true", evaluate(scenario, "(()=>{const b=document.querySelector('button[aria-label=\"Start ambient tour\"]');b.click();return true})()"));
            SystemClock.sleep(1000);
            long started = SystemClock.elapsedRealtime();
            while (true) {
                assertEquals("Tour stays active", "true", evaluate(scenario, "!!document.querySelector('button[aria-label=\"Stop ambient tour\"]')"));
                long elapsed = SystemClock.elapsedRealtime() - started;
                Log.i("OrreryGraphicsTest", "sample seconds=" + elapsed / 1000 + " pid=" + android.os.Process.myPid());
                long remaining = seconds * 1000L - elapsed;
                if (remaining <= 0) break;
                SystemClock.sleep(Math.min(30000L, remaining));
            }
        }
    }
}

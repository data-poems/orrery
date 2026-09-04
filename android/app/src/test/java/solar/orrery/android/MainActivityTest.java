package solar.orrery.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class MainActivityTest {

    @Test
    public void onlyLiteralTrueConsumesAndroidBack() {
        assertTrue(MainActivity.didJavaScriptConsumeBack("true"));
        assertFalse(MainActivity.didJavaScriptConsumeBack("false"));
        assertFalse(MainActivity.didJavaScriptConsumeBack("null"));
        assertFalse(MainActivity.didJavaScriptConsumeBack(null));
    }
}

import Capacitor

/// Registers app-local native bridges before the bundled web app starts.
public final class AppViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(OrreryReviewPromptPlugin())
    }
}

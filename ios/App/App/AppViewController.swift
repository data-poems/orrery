import Capacitor

/// Registers app-local native bridges before the bundled web app starts.
public final class AppViewController: CAPBridgeViewController {
    /// iPhone Duo: tells the page where the fold is (DuoBridge.swift plus the
    /// bundled duo-fold.js shim), so the scene and controls can stay off it.
    private var duo: DuoBridge?

    public override func capacitorDidLoad() {
        // Made here, on the web view's own configuration, before the first page
        // loads. A bridge made in `webViewConfiguration(for:)` never reaches the
        // page: Capacitor 8 swaps the user content controller after that hook.
        if let webView {
            duo = DuoBridge(configuration: webView.configuration)
            duo?.attach(to: webView)
        }
        bridge?.registerPluginInstance(OrreryReviewPromptPlugin())
    }

    public override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        duo?.refresh()
    }
}

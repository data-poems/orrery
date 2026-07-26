import Capacitor
import StoreKit
import UIKit

@objc(OrreryReviewPromptPlugin)
public final class OrreryReviewPromptPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrreryReviewPromptPlugin"
    public let jsName = "OrreryReviewPrompt"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
    ]

    @objc public func requestReview(_ call: CAPPluginCall) {
        let force = call.getBool("force") ?? false

        #if !DEBUG
        if force {
            call.resolve([
                "dispatched": false,
                "reason": "debug-only",
            ])
            return
        }
        #endif

        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active else {
                call.resolve([
                    "dispatched": false,
                    "reason": "application-not-active",
                ])
                return
            }

            let activeScenes = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .filter { $0.activationState == .foregroundActive }
            let foregroundScene = activeScenes.first(where: { scene in
                scene.windows.contains(where: { $0.isKeyWindow })
            }) ?? activeScenes.first

            guard let foregroundScene else {
                call.resolve([
                    "dispatched": false,
                    "reason": "no-foreground-scene",
                ])
                return
            }

            if #available(iOS 18.0, *) {
                AppStore.requestReview(in: foregroundScene)
            } else {
                SKStoreReviewController.requestReview(in: foregroundScene)
            }
            call.resolve(["dispatched": true])
        }
    }
}

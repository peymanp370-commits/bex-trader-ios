import Foundation
import Capacitor

@objc(AppViewController)
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AppleIAPPlugin())
    }
}

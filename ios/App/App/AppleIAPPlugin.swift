import Foundation
import Capacitor
import StoreKit

@objc(AppleIAPPlugin)
public class AppleIAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleIAPPlugin"
    public let jsName = "AppleIAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActiveEntitlements", returnType: CAPPluginReturnPromise)
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("Apple In-App Purchase requires iOS 15 or newer.")
            return
        }

        let productIds = call.getArray("productIds", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: productIds)
                let payload = products.map { product in
                    return [
                        "productId": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice
                    ]
                }
                call.resolve(["ok": true, "products": payload])
            } catch {
                call.reject("Unable to load Apple products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("Apple In-App Purchase requires iOS 15 or newer.")
            return
        }

        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("Missing productId")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Apple product not found: \(productId)")
                    return
                }

                guard product.id == productId else {
                    call.resolve([
                        "ok": false,
                        "reason": "product_lookup_mismatch",
                        "requestedProductId": productId,
                        "returnedProductId": product.id,
                        "message": "Apple returned a different product before purchase."
                    ])
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        var payload = entitlementPayload(transaction)
                        payload["requestedProductId"] = productId

                        guard transaction.productID == productId else {
                            payload["ok"] = false
                            payload["reason"] = "purchase_product_mismatch"
                            payload["requestedProductId"] = productId
                            payload["returnedProductId"] = transaction.productID
                            payload["message"] = "Apple completed or returned a different product than requested."
                            call.resolve(payload)
                            return
                        }

                        await transaction.finish()
                        call.resolve(payload.merging(["ok": true, "verification": "verified"]) { _, new in new })
                    case .unverified(let transaction, let error):
                        var payload = entitlementPayload(transaction)
                        payload["ok"] = false
                        payload["verification"] = "unverified"
                        payload["requestedProductId"] = productId
                        payload["error"] = error.localizedDescription
                        call.resolve(payload)
                    }
                case .userCancelled:
                    call.resolve(["ok": false, "reason": "user_cancelled"])
                case .pending:
                    call.resolve(["ok": false, "reason": "pending"])
                @unknown default:
                    call.resolve(["ok": false, "reason": "unknown"])
                }
            } catch {
                call.reject("Apple purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("Apple restore requires iOS 15 or newer.")
            return
        }

        Task {
            do {
                try await AppStore.sync()
                let entitlements = await currentEntitlementPayloads()
                let productIds = entitlements.compactMap { $0["productId"] as? String }
                call.resolve([
                    "ok": true,
                    "entitlements": entitlements,
                    "productIds": productIds,
                    "restored": productIds
                ])
            } catch {
                call.reject("Restore purchases failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func getActiveEntitlements(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("Apple entitlements require iOS 15 or newer.")
            return
        }

        Task {
            let entitlements = await currentEntitlementPayloads()
            let productIds = entitlements.compactMap { $0["productId"] as? String }
            call.resolve([
                "ok": true,
                "entitlements": entitlements,
                "productIds": productIds,
                "subscriptions": productIds
            ])
        }
    }

    @available(iOS 15.0, *)
    private func currentEntitlementPayloads() async -> [[String: Any]] {
        var items: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction):
                if transaction.isUpgraded { continue }
                items.append(entitlementPayload(transaction))
            default:
                break
            }
        }
        return items
    }

    @available(iOS 15.0, *)
    private func entitlementPayload(_ transaction: Transaction) -> [String: Any] {
        var payload: [String: Any] = [
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "purchaseDateMs": Int(transaction.purchaseDate.timeIntervalSince1970 * 1000),
            "isUpgraded": transaction.isUpgraded,
            "environment": "storekit"
        ]

        if let expirationDate = transaction.expirationDate {
            payload["expirationDateMs"] = Int(expirationDate.timeIntervalSince1970 * 1000)
        } else {
            payload["expirationDateMs"] = NSNull()
        }

        return payload
    }
}

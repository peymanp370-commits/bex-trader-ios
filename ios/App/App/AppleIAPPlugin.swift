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
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
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

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve([
                            "ok": true,
                            "productId": transaction.productID,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "signedTransactionInfo": transaction.jwsRepresentation,
                            "verification": "verified"
                        ])
                    case .unverified(let transaction, let error):
                        call.resolve([
                            "ok": false,
                            "productId": transaction.productID,
                            "transactionId": String(transaction.id),
                            "verification": "unverified",
                            "error": error.localizedDescription
                        ])
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
            var entitlements: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    entitlements.append([
                        "ok": true,
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "signedTransactionInfo": transaction.jwsRepresentation,
                        "verification": "verified"
                    ])
                case .unverified(let transaction, let error):
                    entitlements.append([
                        "ok": false,
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "verification": "unverified",
                        "error": error.localizedDescription
                    ])
                }
            }

            call.resolve(["ok": true, "entitlements": entitlements])
        }
    }

}

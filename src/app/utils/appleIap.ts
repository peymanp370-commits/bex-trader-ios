import { Capacitor, registerPlugin } from "@capacitor/core";

type AppleProduct = {
  productId: string;
  displayName?: string;
  description?: string;
  price?: string;
};

export type AppleEntitlement = {
  ok?: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDateMs?: number;
  expirationDateMs?: number | null;
  isUpgraded?: boolean;
  environment?: string;
  verification?: string;
  reason?: string;
  error?: string;
  message?: string;
};

type ApplePurchaseResult = AppleEntitlement;

type AppleIAPPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{ ok: boolean; products: AppleProduct[] }>;
  purchase(options: { productId: string }): Promise<ApplePurchaseResult>;
  restorePurchases(): Promise<{ ok: boolean; entitlements: AppleEntitlement[]; productIds: string[]; restored?: string[] }>;
  getActiveEntitlements(): Promise<{ ok: boolean; entitlements: AppleEntitlement[]; productIds: string[]; subscriptions?: string[] }>;
};

const AppleIAP = registerPlugin<AppleIAPPlugin>("AppleIAP");

export const APPLE_IAP_PRODUCT_IDS = {
  basic: {
    monthly: "basic_monthly_v4",
    yearly: "basic_yearly_v4",
  },
  pro: {
    monthly: "pro_monthly_v4",
    yearly: "pro_yearly_v4",
  },
  vip: {
    monthly: "vip_monthly_v4",
    yearly: "vip_yearly_v4",
  },
  lifetime: {
    lifetime: "vip_lifetime",
  },
} as const;

export function isNativeIOSApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function appleProductIdForPlan(planId: string, cycle: "monthly" | "yearly" | "lifetime") {
  if (planId === "basic" && cycle !== "lifetime") return APPLE_IAP_PRODUCT_IDS.basic[cycle];
  if (planId === "pro" && cycle !== "lifetime") return APPLE_IAP_PRODUCT_IDS.pro[cycle];
  if (planId === "vip" && cycle !== "lifetime") return APPLE_IAP_PRODUCT_IDS.vip[cycle];
  if (planId === "lifetime") return APPLE_IAP_PRODUCT_IDS.lifetime.lifetime;
  return "";
}

export async function startAppleIapPurchase(productId: string) {
  if (!isNativeIOSApp()) {
    throw new Error("Apple In-App Purchase is only available inside the iOS app.");
  }

  if (!productId) {
    throw new Error("Apple product id is missing.");
  }

  return AppleIAP.purchase({ productId });
}


export async function restoreApplePurchases() {
  if (!isNativeIOSApp()) {
    throw new Error("Restore Purchases is only available inside the iOS app.");
  }
  return AppleIAP.restorePurchases();
}

// Backward-compatible alias used by Login.tsx and older screens.
// Keep this exported so existing imports do not break the Vite build.
export async function restoreAppleIapPurchases() {
  return restoreApplePurchases();
}

export async function getAppleActiveEntitlements() {
  if (!isNativeIOSApp()) {
    throw new Error("Apple entitlements are only available inside the iOS app.");
  }
  return AppleIAP.getActiveEntitlements();
}

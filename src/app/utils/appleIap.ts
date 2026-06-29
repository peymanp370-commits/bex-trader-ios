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

// PHASE1_APPLE_IAP_GUARD:
// Keep StoreKit plugin failures readable and prevent silent plan-state bugs.
async function withAppleIapGuard<T>(context: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error: any) {
    const message = String(error?.message || error?.error || error?.code || error || "APPLE_IAP_ERROR");
    // PHASE2_APPLE_IAP_LAST_ERROR: keep the last StoreKit/plugin error visible to VIP UI/debug.
    try {
      localStorage.setItem("appleIapLastError", message);
      localStorage.setItem("appleIapLastErrorAt", String(Date.now()));
    } catch {
      // ignore storage issues
    }
    throw new Error(`Apple IAP ${context} failed: ${message}`);
  }
}

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

export type AppleProductPlan = {
  plan: "basic" | "pro" | "vip" | "lifetime";
  billing: "monthly" | "yearly" | "lifetime";
  storagePlan: "BASIC" | "PRO" | "VIP_AUTO" | "LIFETIME";
  tier: number;
};

const APPLE_PRODUCT_PLAN_MAP: Record<string, AppleProductPlan> = {
  [APPLE_IAP_PRODUCT_IDS.basic.monthly]: { plan: "basic", billing: "monthly", storagePlan: "BASIC", tier: 100 },
  [APPLE_IAP_PRODUCT_IDS.basic.yearly]: { plan: "basic", billing: "yearly", storagePlan: "BASIC", tier: 100 },
  [APPLE_IAP_PRODUCT_IDS.pro.monthly]: { plan: "pro", billing: "monthly", storagePlan: "PRO", tier: 200 },
  [APPLE_IAP_PRODUCT_IDS.pro.yearly]: { plan: "pro", billing: "yearly", storagePlan: "PRO", tier: 200 },
  [APPLE_IAP_PRODUCT_IDS.vip.monthly]: { plan: "vip", billing: "monthly", storagePlan: "VIP_AUTO", tier: 300 },
  [APPLE_IAP_PRODUCT_IDS.vip.yearly]: { plan: "vip", billing: "yearly", storagePlan: "VIP_AUTO", tier: 300 },
  [APPLE_IAP_PRODUCT_IDS.lifetime.lifetime]: { plan: "lifetime", billing: "lifetime", storagePlan: "LIFETIME", tier: 400 },
};

export function applePlanForProductId(productId: string): AppleProductPlan | null {
  const id = String(productId || "").trim();
  return APPLE_PRODUCT_PLAN_MAP[id] || null;
}

export function isKnownAppleProductId(productId: string) {
  return Boolean(applePlanForProductId(productId));
}

function isActiveAppleSubscription(entitlement: AppleEntitlement, nowMs: number) {
  const productPlan = applePlanForProductId(entitlement.productId || "");
  if (!productPlan || productPlan.billing === "lifetime") return false;

  // StoreKit subscriptions should include expirationDateMs. Treat missing
  // expiration as active only for subscription product IDs returned directly
  // from Transaction.currentEntitlements, and reject clearly expired records.
  const expiration = Number(entitlement.expirationDateMs || 0);
  return !expiration || expiration > nowMs - 5 * 60 * 1000;
}

export function chooseBestAppleRestoreEntitlements(entitlements: AppleEntitlement[]) {
  const nowMs = Date.now();
  const seen = new Set<string>();

  const clean = (Array.isArray(entitlements) ? entitlements : [])
    .filter((item) => item && item.productId && item.isUpgraded !== true)
    .filter((item) => {
      const productId = String(item.productId || "").trim();
      if (!isKnownAppleProductId(productId)) return false;
      const key = [
        productId,
        item.originalTransactionId || "",
        item.transactionId || "",
        item.expirationDateMs || "",
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const activeSubscriptions = clean
    .filter((item) => isActiveAppleSubscription(item, nowMs))
    .sort((a, b) => {
      const pa = applePlanForProductId(a.productId || "");
      const pb = applePlanForProductId(b.productId || "");
      const tierDiff = (pb?.tier || 0) - (pa?.tier || 0);
      if (tierDiff) return tierDiff;
      return Number(b.expirationDateMs || b.purchaseDateMs || 0) - Number(a.expirationDateMs || a.purchaseDateMs || 0);
    });

  // Critical restore rule:
  // If Apple returns both an old lifetime sandbox entitlement and a current
  // monthly/yearly subscription, the active subscription wins. This prevents
  // Restore from upgrading a BASIC/PRO/VIP subscription account back to
  // LIFETIME just because the tester Apple ID still owns an old lifetime item.
  if (activeSubscriptions.length) return [activeSubscriptions[0]];

  const lifetime = clean
    .filter((item) => applePlanForProductId(item.productId || "")?.billing === "lifetime")
    .sort((a, b) => Number(b.purchaseDateMs || 0) - Number(a.purchaseDateMs || 0));

  return lifetime.length ? [lifetime[0]] : [];
}

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

  return withAppleIapGuard("purchase", () => AppleIAP.purchase({ productId }));
}


export async function restoreApplePurchases() {
  if (!isNativeIOSApp()) {
    throw new Error("Restore Purchases is only available inside the iOS app.");
  }
  return withAppleIapGuard("restore", () => AppleIAP.restorePurchases());
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
  return withAppleIapGuard("active_entitlements", () => AppleIAP.getActiveEntitlements());
}



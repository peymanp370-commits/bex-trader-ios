import { Capacitor, registerPlugin } from "@capacitor/core";

type AppleProduct = {
  productId: string;
  displayName?: string;
  description?: string;
  price?: string;
};

type ApplePurchaseResult = {
  ok?: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  environment?: string;
  verification?: string;
  reason?: string;
  error?: string;
  message?: string;
  activeSubscriptions?: string[];
  subscriptions?: string[];
};

type AppleRestoreResult = {
  ok: boolean;
  restored?: string[];
  activeSubscriptions?: string[];
  subscriptions?: string[];
  reason?: string;
  error?: string;
  message?: string;
};

type AppleActiveSubscriptionsResult = {
  ok: boolean;
  subscriptions: string[];
  activeSubscriptions?: string[];
  reason?: string;
  error?: string;
  message?: string;
};

type AppleIAPPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{ ok: boolean; products: AppleProduct[] }>;
  purchase(options: { productId: string }): Promise<ApplePurchaseResult>;
  restorePurchases(): Promise<AppleRestoreResult>;
  getActiveSubscriptions(): Promise<AppleActiveSubscriptionsResult>;
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
  lifetime: "vip_lifetime",
} as const;

export function isNativeIOSApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function appleProductIdForPlan(planId: string, cycle: "monthly" | "yearly") {
  if (planId === "basic") return APPLE_IAP_PRODUCT_IDS.basic[cycle];
  if (planId === "pro") return APPLE_IAP_PRODUCT_IDS.pro[cycle];
  if (planId === "vip") return APPLE_IAP_PRODUCT_IDS.vip[cycle];
  if (planId === "lifetime") return APPLE_IAP_PRODUCT_IDS.lifetime;
  return "";
}

export function applePlanFromProductId(productId?: string) {
  const id = String(productId || "").trim();
  if (!id) return null;

  if (id === APPLE_IAP_PRODUCT_IDS.lifetime) {
    return "LIFETIME";
  }

  if (id === APPLE_IAP_PRODUCT_IDS.vip.monthly || id === APPLE_IAP_PRODUCT_IDS.vip.yearly) {
    return "VIP";
  }

  if (id === APPLE_IAP_PRODUCT_IDS.pro.monthly || id === APPLE_IAP_PRODUCT_IDS.pro.yearly) {
    return "PRO";
  }

  if (id === APPLE_IAP_PRODUCT_IDS.basic.monthly || id === APPLE_IAP_PRODUCT_IDS.basic.yearly) {
    return "BASIC";
  }

  return null;
}

export function bestApplePlanFromProductIds(productIds: string[] = []) {
  const plans = productIds
    .map((id) => applePlanFromProductId(id))
    .filter(Boolean) as string[];

  if (plans.includes("LIFETIME")) return "LIFETIME";
  if (plans.includes("VIP")) return "VIP";
  if (plans.includes("PRO")) return "PRO";
  if (plans.includes("BASIC")) return "BASIC";
  return null;
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

export async function getAppleActiveSubscriptions() {
  if (!isNativeIOSApp()) {
    throw new Error("Apple subscriptions are only available inside the iOS app.");
  }

  return AppleIAP.getActiveSubscriptions();
}
